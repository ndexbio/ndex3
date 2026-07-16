import { NDExFileType } from '@js4cytoscape/ndex-client'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

/**
 * Shared shortcut-target resolution.
 *
 * Network-level actions (Download, Open in Cytoscape Desktop, Open in
 * Cytoscape Web) must operate on the shortcut's TARGET network, never on the
 * shortcut's own UUID. This module is the single implementation of that
 * resolution, used by all three actions.
 *
 * Shortcut attributes use snake_case (`target`, `target_type`,
 * `target_status`) on list items; the getShortcut API returns camelCase.
 * Both are handled here.
 */

export interface ResolvedNetworkTarget {
  networkId: string
  /** Access key carried by the shortcut chain, if any. */
  accessKey?: string
}

export interface ShortcutResolverOptions {
  ndexBaseUrl: string
  token?: string
  /** Access key inherited from the current page. Used as a fallback when the
   * shortcut chain does not provide a more specific key. */
  accessKey?: string
}

/** Minimal item shape the type helpers need (FileItemBase-compatible). */
export interface TypedItem {
  type: NDExFileType
  attributes?: Record<string, any>
}

const MAX_DEPTH = 10 // Prevent infinite shortcut loops

/**
 * True when the row should offer network actions (Download / Open in
 * Cytoscape): a genuine network, or a shortcut resolving to a network.
 * A shortcut with no target_type is assumed to point at a network — the
 * overwhelmingly common case on lightweight list/search items.
 */
export const targetsNetwork = (
  item: TypedItem | null | undefined,
): boolean => {
  if (!item) return false
  if (item.type === NDExFileType.NETWORK) return true
  if (item.type !== NDExFileType.SHORTCUT) return false
  const targetType = item.attributes?.target_type as NDExFileType | undefined
  return targetType === undefined || targetType === NDExFileType.NETWORK
}

/**
 * True when the row behaves as a folder (a folder, or a shortcut to one).
 * Folder rows never offer Download / Open in Cytoscape.
 */
export const targetsFolder = (
  item: TypedItem | null | undefined,
): boolean => {
  if (!item) return false
  if (item.type === NDExFileType.FOLDER) return true
  return (
    item.type === NDExFileType.SHORTCUT &&
    item.attributes?.target_type === NDExFileType.FOLDER
  )
}

/**
 * Recursively resolves a shortcut chain to the final target network UUID.
 *
 * @param itemId - Starting UUID (network or shortcut)
 * @param itemType - Type of the starting item
 * @param itemAttributes - Attributes of the starting item
 * @param options - NDEx server base URL, optional auth token, and page-level
 *   access key for resolving intermediate shortcuts
 * @returns Final network UUID plus the effective access key
 * @throws Error if the chain is broken, targets a folder, or exceeds max depth
 */
export const resolveNetworkTarget = async (
  itemId: string,
  itemType: NDExFileType,
  itemAttributes: Record<string, any> | undefined,
  options: ShortcutResolverOptions,
): Promise<ResolvedNetworkTarget> => {
  let currentType = itemType
  let currentAttributes: Record<string, any> = itemAttributes ?? {}
  let depth = 0
  let accessKey: string | undefined

  // A caller (e.g. the search results page) may hand us a shortcut typed as
  // NETWORK via a dropdownType fallback. Don't trust the type label on its
  // own — if the attributes carry a `target`, treat the item as a shortcut.
  const looksLikeShortcut =
    currentType === NDExFileType.SHORTCUT ||
    (currentAttributes?.target as string | undefined) != null

  // Genuine network (no shortcut target attributes) — return immediately.
  if (currentType === NDExFileType.NETWORK && !looksLikeShortcut) {
    return {
      networkId: itemId,
      accessKey:
        (currentAttributes?.accessKey as string | undefined) ??
        options.accessKey,
    }
  }

  // Normalize: attributes say shortcut even if the type was passed as NETWORK.
  if (looksLikeShortcut) {
    currentType = NDExFileType.SHORTCUT
  }

  while (currentType === NDExFileType.SHORTCUT) {
    depth++
    if (depth > MAX_DEPTH) {
      throw new Error('Shortcut chain too deep. Maximum depth of 10 exceeded.')
    }

    // Check if shortcut is active (attributes use snake_case).
    // Search-result items may omit target_status; absence is treated as ACTIVE.
    const targetStatus = currentAttributes?.target_status as string | undefined
    if (targetStatus != null && targetStatus !== 'ACTIVE') {
      throw new Error('This shortcut is no longer valid. The target has been deleted.')
    }

    const targetId = currentAttributes?.target as string | undefined

    // A key attached directly to a shortcut is more specific than the key
    // inherited from the folder page. Keep the first chain-specific key, while
    // retaining the page key as a final fallback.
    if (!accessKey && currentAttributes?.accessKey) {
      accessKey = currentAttributes.accessKey as string
    }

    // target_type may be absent on lightweight search items. When the target
    // UUID is present but the type is missing, assume it points to a NETWORK.
    const targetType =
      (currentAttributes?.target_type as NDExFileType | undefined) ??
      NDExFileType.NETWORK

    if (!targetId) {
      throw new Error('Invalid shortcut: missing target information.')
    }

    if (targetType === NDExFileType.NETWORK) {
      return { networkId: targetId, accessKey: accessKey ?? options.accessKey }
    }

    if (targetType === NDExFileType.SHORTCUT) {
      try {
        const ndexClient = getNdexClient(options.ndexBaseUrl, options.token)
        const shortcutData = await ndexClient.files.getShortcut(
          targetId,
          accessKey ?? options.accessKey,
        )

        // API returns camelCase; normalize back to the snake_case attribute
        // shape so the next loop iteration reads it uniformly.
        currentType = NDExFileType.SHORTCUT
        currentAttributes = {
          target: shortcutData.target,
          target_type: shortcutData.targetType,
          target_status: (shortcutData as any).targetStatus || 'ACTIVE',
          accessKey: (shortcutData as any).accessKey,
        }

        if (!accessKey && currentAttributes.accessKey) {
          accessKey = currentAttributes.accessKey as string
        }
      } catch (error) {
        throw new Error(
          `Failed to resolve shortcut chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    } else {
      // Target is neither NETWORK nor SHORTCUT (e.g., FOLDER)
      throw new Error(`Cannot resolve a ${targetType} target. Only networks are supported.`)
    }
  }

  throw new Error('Invalid shortcut chain.')
}
