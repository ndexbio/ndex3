import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex'

export interface TrashContents {
  items: FileItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  refresh: () => Promise<void>
  emptyTrash: () => Promise<void>
  restoreItems: (networkIds?: string[], folderIds?: string[], shortcutIds?: string[]) => Promise<void>
  permanentDelete: (itemId: string) => Promise<void>
}

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
        key[1] === null
      )
    } catch (error) {
      console.error('Error restoring items from trash:', error)
      throw error
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
  }
}

/**
 * Helper function to fetch trash contents directly without using the hook
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @returns Promise that resolves to trash contents
 */
export const fetchTrashContents = async (
  ndexBaseUrl: string,
  token: string,
): Promise<FileItemBase[]> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  return ndexClient.files.getTrash()
}
