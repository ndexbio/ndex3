import { useState, useEffect } from 'react'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useToast } from '@/lib/contexts/ToastContext'
import { CyNDExService, NDExFileType } from '@js4cytoscape/ndex-client'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

const CYNDEX_PORT = 1234 // Default Cytoscape REST API port
const POLL_INTERVAL_MS = 4000 // How often to re-check Cytoscape availability

/**
 * Module-level singleton poller for Cytoscape Desktop availability.
 *
 * All useCyNDEx() consumers share ONE interval and ONE in-flight status check
 * instead of each component polling localhost:1234 independently. Components
 * subscribe to the shared state and are notified whenever it changes.
 */
let cyStatusAvailable = false
let cyStatusChecking = true // true until the first probe resolves
let cyPollInterval: ReturnType<typeof setInterval> | null = null
let cyInFlight = false
const cyStatusListeners = new Set<(available: boolean, checking: boolean) => void>()

const notifyCyStatusListeners = () => {
  cyStatusListeners.forEach((fn) => fn(cyStatusAvailable, cyStatusChecking))
}

const probeCytoscape = async () => {
  // Avoid overlapping probes if a previous one is still pending
  if (cyInFlight) return
  cyInFlight = true
  const prevAvailable = cyStatusAvailable
  const wasChecking = cyStatusChecking
  try {
    const cyNDEx = new CyNDExService(CYNDEX_PORT)
    await cyNDEx.getCyNDExStatus()
    cyStatusAvailable = true
  } catch {
    cyStatusAvailable = false
  } finally {
    cyStatusChecking = false
    cyInFlight = false
    // Only notify when something actually changed (avoids needless re-renders)
    if (cyStatusAvailable !== prevAvailable || wasChecking) {
      notifyCyStatusListeners()
    }
  }
}

const startCyPolling = () => {
  if (cyPollInterval !== null) return // Already polling
  // Fire an immediate probe, then poll on an interval
  void probeCytoscape()
  cyPollInterval = setInterval(() => void probeCytoscape(), POLL_INTERVAL_MS)
}

const stopCyPolling = () => {
  if (cyPollInterval !== null) {
    clearInterval(cyPollInterval)
    cyPollInterval = null
  }
}

const subscribeCyStatus = (
  listener: (available: boolean, checking: boolean) => void
) => {
  cyStatusListeners.add(listener)
  // First subscriber starts the shared poller
  if (cyStatusListeners.size === 1) {
    startCyPolling()
  }
  // Push current state immediately so the new subscriber isn't stale
  listener(cyStatusAvailable, cyStatusChecking)

  return () => {
    cyStatusListeners.delete(listener)
    // Last subscriber stops the shared poller and resets to a checking state
    if (cyStatusListeners.size === 0) {
      stopCyPolling()
      cyStatusChecking = true
    }
  }
}

/**
 * Custom hook for CyNDEx operations
 * Handles opening networks in Cytoscape Desktop with proper token management,
 * and exposes shared live availability of Cytoscape Desktop.
 */
export const useCyNDEx = () => {
  const config = useConfig()
  const { keycloak, isAuthenticated, token } = useAuth()
  const { addToast } = useToast()
  const [isOpening, setIsOpening] = useState<Record<string, boolean>>({})

  // Live availability of Cytoscape Desktop, backed by the shared singleton poller.
  const [isCytoscapeAvailable, setIsCytoscapeAvailable] = useState(cyStatusAvailable)
  const [isCheckingCytoscape, setIsCheckingCytoscape] = useState(cyStatusChecking)

  useEffect(() => {
    const unsubscribe = subscribeCyStatus((available, checking) => {
      setIsCytoscapeAvailable(available)
      setIsCheckingCytoscape(checking)
    })
    return unsubscribe
  }, [])

  /**
   * Recursively resolves a shortcut chain to find the final target network UUID
   *
   * @param itemId - Starting UUID (could be network or shortcut)
   * @param itemType - Type of the starting item
   * @param itemAttributes - Attributes of the starting item
   * @returns Object with final network UUID and access key (if needed)
   * @throws Error if shortcut chain is broken or exceeds max depth
   */
  const resolveShortcutChain = async (
    itemId: string,
    itemType: NDExFileType,
    itemAttributes: Record<string, any>
  ): Promise<{ networkId: string; accessKey?: string }> => {
    const MAX_DEPTH = 10 // Prevent infinite loops
    let currentId = itemId
    let currentType = itemType
    let currentAttributes = itemAttributes
    let depth = 0
    let accessKey: string | undefined

    // If it's already a network, return immediately
    if (currentType === NDExFileType.NETWORK) {
      return {
        networkId: currentId,
        accessKey: currentAttributes?.accessKey as string | undefined
      }
    }

    // Resolve shortcut chain
    while (currentType === NDExFileType.SHORTCUT) {
      depth++

      // Prevent infinite loops
      if (depth > MAX_DEPTH) {
        throw new Error('Shortcut chain too deep. Maximum depth of 10 exceeded.')
      }

      // Check if shortcut is active (attributes use snake_case)
      const targetStatus = currentAttributes?.target_status as string
      if (targetStatus !== 'ACTIVE') {
        throw new Error('This shortcut is no longer valid. The target has been deleted.')
      }

      // Get target information (attributes use snake_case)
      const targetId = currentAttributes?.target as string
      const targetType = currentAttributes?.target_type as NDExFileType

      if (!targetId || !targetType) {
        throw new Error('Invalid shortcut: missing target information.')
      }

      // If target is a network, we're done
      if (targetType === NDExFileType.NETWORK) {
        // Keep the access key from the deepest level that has one
        if (!accessKey && currentAttributes?.accessKey) {
          accessKey = currentAttributes.accessKey as string
        }
        return { networkId: targetId, accessKey }
      }

      // If target is another shortcut, fetch it and continue
      if (targetType === NDExFileType.SHORTCUT) {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          const shortcutData = await ndexClient.files.getShortcut(targetId)

          // Update for next iteration
          // Note: API returns camelCase (targetType), but we need to handle both formats
          currentId = (shortcutData as any).uuid || targetId
          currentType = NDExFileType.SHORTCUT

          // Convert API response (camelCase) to attributes format (snake_case) for consistency
          currentAttributes = {
            target: shortcutData.target,
            target_type: shortcutData.targetType,
            target_status: (shortcutData as any).targetStatus || 'ACTIVE',
            accessKey: (shortcutData as any).accessKey
          }

          // Preserve access key if we don't have one yet
          if (!accessKey && currentAttributes.accessKey) {
            accessKey = currentAttributes.accessKey as string
          }
        } catch (error) {
          throw new Error(`Failed to resolve shortcut chain: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        // Target is neither NETWORK nor SHORTCUT (e.g., FOLDER)
        throw new Error(`Cannot open ${targetType} in Cytoscape Desktop. Only networks are supported.`)
      }
    }

    throw new Error('Invalid shortcut chain.')
  }

  /**
   * Get a fresh ID token for CyNDEx operations
   *
   * Strategy: Always call updateToken() before getting idToken to ensure freshness
   * - For authenticated users: Refresh token if it expires within 60 seconds
   * - For anonymous users: Return undefined (no auth needed)
   *
   * @returns Promise<string | undefined> - Fresh ID token or undefined for anonymous
   */
  const getFreshIdToken = async (): Promise<string | undefined> => {
    if (!isAuthenticated || !keycloak) {
      return undefined // Anonymous user - no token needed
    }

    try {
      // Request token refresh if it expires within 60 seconds
      // This returns true if token was refreshed, false if still valid
      await keycloak.updateToken(60)

      // Get the ID token (not the access token)
      // Keycloak stores this as idToken property
      const idToken = keycloak.idToken

      if (!idToken) {
        throw new Error('Failed to retrieve ID token from Keycloak')
      }

      return idToken
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, user session is likely expired - force re-login
      keycloak.login()
      throw new Error('Session expired. Please log in again.')
    }
  }

  /**
   * Open a network in Cytoscape Desktop
   *
   * @param itemId - UUID of the item to open (network or shortcut)
   * @param itemName - Name of the item (for display in toast)
   * @param itemType - Type of the item (NETWORK or SHORTCUT)
   * @param itemAttributes - Attributes of the item
   * @returns Promise<void>
   */
  const openInCytoscape = async (
    itemId: string,
    itemName: string,
    itemType: NDExFileType,
    itemAttributes: Record<string, any>
  ): Promise<void> => {
    setIsOpening((prev) => ({ ...prev, [itemId]: true }))

    try {
      // Step 1: Resolve shortcut chain to get final network UUID
      const { networkId, accessKey } = await resolveShortcutChain(
        itemId,
        itemType,
        itemAttributes
      )

      // Step 2: Get fresh ID token (if authenticated)
      const idToken = await getFreshIdToken()

      // Step 3: Create CyNDEx service instance
      const cyNDEx = new CyNDExService(CYNDEX_PORT)

      // Ensure URL has protocol (following pattern from ndex-client-manager.ts)
      const ndexUrl = config.ndexBaseUrl && config.ndexBaseUrl.startsWith('http')
        ? config.ndexBaseUrl
        : `https://${config.ndexBaseUrl || 'ndexbio.org'}`

      cyNDEx.setNDExBaseURL(ndexUrl)

      // Step 4: Set authentication if user is logged in
      if (idToken) {
        cyNDEx.setAuthToken(idToken)
      }

      // Step 5: Check if Cytoscape is running
      try {
        await cyNDEx.getCyNDExStatus()
      } catch (error) {
        throw new Error(
          'Unable to connect to Cytoscape Desktop. Please ensure Cytoscape is running and the CyNDEx-2 app is installed.'
        )
      }

      // Step 6: Send FINAL NETWORK to Cytoscape (not the shortcut)
      await cyNDEx.postNDExNetworkToCytoscape(networkId, accessKey)

      // Success notification
      addToast({
        title: `Opening "${itemName}" in Cytoscape Desktop`,
        description: 'The network is being loaded in Cytoscape.',
        type: 'success',
        duration: 4000,
      })
    } catch (error) {
      console.error('Error opening network in Cytoscape:', error)

      // Error notification with helpful message
      const errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred'

      addToast({
        title: 'Failed to open network in Cytoscape',
        description: errorMessage,
        type: 'error',
        duration: 6000,
      })

      throw error
    } finally {
      setIsOpening((prev) => ({ ...prev, [itemId]: false }))
    }
  }

  return {
    openInCytoscape,
    isOpening,
    isCytoscapeAvailable,
    isCheckingCytoscape,
  }
}