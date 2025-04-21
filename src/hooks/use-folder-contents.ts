import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

// Define types for folder items
export interface FolderItemBase {
  uuid: string
  name: string
  type: 'FOLDER' | 'NETWORK' | 'SHORTCUT'
  modificationTime: string | Date
  attributes: {
    [key: string]: string | number | boolean
  }
}

export interface FolderContents {
  items: FolderItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  refresh: () => Promise<void>
}

/**
 * Hook to fetch contents of a folder (networks and sub-folders)
 * @param folderId UUID of the folder to fetch contents from. If null, fetches home folder contents.
 * @returns Object containing folder contents, loading state, and error
 */
export const useFolderContents = (
  folderId: string | null = null,
): FolderContents => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = isAuthenticated ? ['folderContents', folderId, token] : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    if (!isAuthenticated) {
      return []
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      let items

      if (folderId === null) {
        // Get home folder contents
        items = await ndexClient.getFolderList('home', undefined, 'compact')
      } else {
        // Get specific folder contents
        items = await ndexClient.getFolderList(folderId, undefined, 'compact')
      }

      return items || []
    } catch (error) {
      console.error('Error fetching folder contents:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading, mutate } = useSWR<FolderItemBase[]>(
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

  return {
    items: data || [],
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
    refresh,
  }
}

/**
 * Helper function to fetch folder directly
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param folderId UUID of the folder to fetch. If null, fetches home folder.
 * @returns Promise that resolves to folder contents
 */
export const fetchFolderContents = async (
  ndexBaseUrl: string,
  token: string,
  folderId: string | null = null,
): Promise<FolderItemBase[]> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)

  if (folderId === null) {
    // Get home folder contents
    return ndexClient._httpGetV3ProtectedObj('files/folders/home/list')
  } else {
    // Get specific folder contents
    return ndexClient.getFolderList(folderId)
  }
}
