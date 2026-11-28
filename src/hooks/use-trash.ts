import useSWR, { mutate as globalMutate } from 'swr'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex'
import {
  ParentId,
  collectTrashedDescendants,
  readParentId,
} from '@/lib/utils/trash-tree'

/** Outcome of expanding a trash selection to include folder contents. */
export interface RestoreSelection {
  /** The items the user picked. */
  roots: FileItemBase[]
  /** Trashed items found inside the selected folders. */
  descendants: FileItemBase[]
  /**
   * True when at least one trashed item's parent could not be determined, so
   * `descendants` may be incomplete and the user should be told as much.
   */
  isPartial: boolean
}

export interface TrashContents {
  items: FileItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  refresh: () => Promise<void>
  emptyTrash: () => Promise<void>
  restoreItems: (networkIds?: string[], folderIds?: string[], shortcutIds?: string[]) => Promise<void>
  permanentDelete: (itemId: string) => Promise<void>
  resolveRestoreSelection: (ids: string[]) => Promise<RestoreSelection>
}

/** Parent lookups run in small batches so a large trash doesn't burst the API. */
const PARENT_LOOKUP_BATCH_SIZE = 6

/**
 * Hook to fetch and manage trash contents
 * @returns Object containing trash contents, loading state, error, and trash management functions
 */
export const useTrash = (): TrashContents => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = isAuthenticated ? ['trashContents', token] : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    if (!isAuthenticated) {
      return []
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      // Get trash contents
      const items = await ndexClient.files.getTrash()
      return items || []
    } catch (error) {
      console.error('Error fetching trash contents:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading, mutate } = useSWR<FileItemBase[]>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    },
  )

  // Function to manually refresh the data
  const refresh = async () => {
    if (cacheKey) {
      await mutate()
    }
  }

  /**
   * Empties the trash by deleting all items permanently
   * @returns Promise that resolves when trash is emptied
   */
  const emptyTrash = async (): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to empty trash')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.emptyTrash()
      
      // Refresh trash contents after emptying
      await refresh()
    } catch (error) {
      console.error('Error emptying trash:', error)
      throw error
    }
  }

  /**
   * Restores selected items from trash
   * @param networkIds Array of network IDs to restore
   * @param folderIds Array of folder IDs to restore
   * @param shortcutIds Array of shortcut IDs to restore
   * @returns Promise that resolves when items are restored
   */
  const restoreItems = async (
    networkIds: string[] = [],
    folderIds: string[] = [],
    shortcutIds: string[] = [],
  ): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to restore items')
    }

    // Skip API call if no items selected
    if (networkIds.length === 0 && folderIds.length === 0 && shortcutIds.length === 0) {
      return
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.restoreFile(networkIds, folderIds, shortcutIds)
      
      // Refresh trash contents after restoring items
      await refresh()
      
      // Refresh home folder contents since restored items might appear there
      globalMutate((key) =>
        Array.isArray(key) &&
        key[0] === 'folderContents' &&
        key[1] === null &&
        key[2] === token
      )
    } catch (error) {
      console.error('Error restoring items from trash:', error)
      throw error
    }
  }

  /**
   * Expands a trash selection to include everything inside the selected
   * folders.
   *
   * Needed because trashing a folder cascades — its contents land in the trash
   * as separate, flat entries — so restoring the folder on its own would bring
   * it back empty. The parent of each trashed item is taken from the listing
   * when the server provides it, and fetched per item otherwise.
   *
   * Lookup failures are tolerated: a partial tree still restores the folder and
   * whatever was resolved, with `isPartial` set so the caller can say so.
   */
  const resolveRestoreSelection = async (
    ids: string[],
  ): Promise<RestoreSelection> => {
    const all = data || []
    const roots = all.filter((item) => ids.includes(item.uuid))
    const rootFolderIds = roots
      .filter((item) => item.type === NDExFileType.FOLDER)
      .map((item) => item.uuid)

    // Only folders can contain anything, so anything else restores as-is.
    if (rootFolderIds.length === 0) {
      return { roots, descendants: [], isPartial: false }
    }

    const parentOf = new Map<string, ParentId>()
    const needsLookup: FileItemBase[] = []

    for (const item of all) {
      const parent = readParentId(item)
      if (parent === undefined) {
        needsLookup.push(item)
      } else {
        parentOf.set(item.uuid, parent)
      }
    }

    let isPartial = false

    if (needsLookup.length > 0) {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)

      const lookupParent = async (item: FileItemBase): Promise<void> => {
        try {
          if (item.type === NDExFileType.FOLDER) {
            const folder = await ndexClient.files.getFolder(item.uuid)
            parentOf.set(item.uuid, folder?.parent ?? null)
          } else if (item.type === NDExFileType.SHORTCUT) {
            const shortcut = await ndexClient.files.getShortcut(item.uuid)
            parentOf.set(item.uuid, shortcut?.parent ?? null)
          } else {
            const summary = await ndexClient.networks.getNetworkSummary(
              item.uuid,
            )
            parentOf.set(item.uuid, summary?.parentDirUUID ?? null)
          }
        } catch (error) {
          // A parent we can't read means a branch we can't follow. Keep going:
          // restoring some of the tree beats refusing to restore any of it.
          console.warn(
            `Could not determine the parent of trashed item "${item.name}":`,
            error,
          )
          isPartial = true
        }
      }

      for (let i = 0; i < needsLookup.length; i += PARENT_LOOKUP_BATCH_SIZE) {
        await Promise.all(
          needsLookup
            .slice(i, i + PARENT_LOOKUP_BATCH_SIZE)
            .map((item) => lookupParent(item)),
        )
      }
    }

    return {
      roots,
      descendants: collectTrashedDescendants(all, parentOf, rootFolderIds),
      isPartial,
    }
  }

  /**
   * Permanently deletes selected an item from trash
   * @param UUID of the item to delete
   * @returns Promise that resolves when item is deleted
   */
  const permanentDelete = async (itemId: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to delete item')
    }   

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.permanentlyDeleteFile(itemId)
    } catch (error) {
      console.error('Error deleting item from trash:', error)
      throw error
    }
  }

  return {
    items: data || [],
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
    refresh,
    emptyTrash,
    restoreItems,
    permanentDelete,
    resolveRestoreSelection,
  }
}