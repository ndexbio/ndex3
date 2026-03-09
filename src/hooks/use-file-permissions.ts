import { useMemo } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { getExistingPermissions } from '@/lib/api/sharing'
import { ShareableItem, FilePermissionList, UserPermission } from '@/types/sharing'
import { Permission, NDExUser } from '@js4cytoscape/ndex-client'

/**
 * Hook to fetch file permissions for ShareDialog
 * @param items Array of shareable items to get permissions for
 * @param isOpen Whether the dialog is open (for conditional fetching)
 * @param userDetailsMap Optional map of user UUIDs to user details for enriching permission data
 * @returns Object containing permissions data, loading state, and error
 */
export const useFilePermissions = (
  items: ShareableItem[],
  isOpen: boolean,
  userDetailsMap?: Map<string, NDExUser>
) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create cache key only when dialog is open and we have items
  const cacheKey = useMemo(() => {
    if (!isOpen || !items.length || !isAuthenticated) {
      return null
    }

    // Create a stable key based on item UUIDs and types
    const filesKey = items
      .map(item => `${item.uuid}:${item.type}`)
      .sort()
      .join(',')

    return ['filePermissions', filesKey, token]
  }, [items, isOpen, isAuthenticated, token])

  // Fetcher function
  const fetcher = async () => {
    if (!items.length) {
      return null
    }

    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    return await getExistingPermissions(ndexClient, items)
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<FilePermissionList | null>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  // Process the raw permissions data into UserPermission format
  const processedPermissions = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return new Map<string, UserPermission>()
    }

    const userPermissionsMap = new Map<string, UserPermission>()
    const userPermissionCounts = new Map<string, { read: number; write: number; admin: number; total: number }>()

    // Aggregate permissions across all files
    data.forEach(fileRecord => {
      Object.entries(fileRecord).forEach(([, fileDetails]) => {
        Object.entries(fileDetails.members).forEach(([userUuid, permission]) => {
          // Initialize counters for this user
          if (!userPermissionCounts.has(userUuid)) {
            userPermissionCounts.set(userUuid, { read: 0, write: 0, admin: 0, total: 0 })
          }

          const counts = userPermissionCounts.get(userUuid)!
          counts.total++

          if (permission === Permission.READ) {
            counts.read++
          } else if (permission === Permission.WRITE) {
            counts.write++
          } else if (permission === Permission.ADMIN) {
            counts.admin++
          }
        })
      })
    })

    // Convert to UserPermission objects with enriched user data
    userPermissionCounts.forEach((counts, userUuid) => {
      // Check if user has admin permissions (owner)
      const isOwner = counts.admin > 0

      // Determine aggregated permission level
      let aggregatedPermission: 'READ' | 'EDIT' | 'MIXED'

      if (isOwner) {
        // If user has admin permissions on any file, they're the owner
        aggregatedPermission = 'EDIT' // Display as Edit but with owner status
      } else if (counts.read === counts.total) {
        aggregatedPermission = 'READ'
      } else if (counts.write === counts.total) {
        aggregatedPermission = 'EDIT'
      } else {
        aggregatedPermission = 'MIXED'
      }

      // Get user details if available
      const userDetails = userDetailsMap?.get(userUuid)

      // Create UserPermission object with enriched data
      const userPermission: UserPermission = {
        userUuid,
        username: userDetails?.userName || userUuid,
        email: userDetails?.emailAddress || userUuid, // Keep for compatibility but won't be displayed
        fullName: userDetails
          ? `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.userName
          : userUuid,
        permission: aggregatedPermission,
        isOwner,
      }

      userPermissionsMap.set(userUuid, userPermission)
    })

    return userPermissionsMap
  }, [data, userDetailsMap])

  // Extract user UUIDs for use with user details hook
  const userUuids = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return []
    }

    const uuids = new Set<string>()
    data.forEach(fileRecord => {
      Object.entries(fileRecord).forEach(([, fileDetails]) => {
        Object.keys(fileDetails.members).forEach(userUuid => {
          uuids.add(userUuid)
        })
      })
    })

    return Array.from(uuids)
  }, [data])

  return {
    rawData: data,
    userPermissions: processedPermissions,
    userUuids,
    isLoading,
    error: error?.message || null,
    hasData: data !== null && data !== undefined,
  }
}

