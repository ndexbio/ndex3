import { useState } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

// Define types for folder items
export interface FolderItemBase {
  uuid: string
  name: string
  type: 'folder' | 'network'
}

export interface FolderContents {
  items: FolderItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
}

/**
 * Hook to fetch contents of a folder (networks and sub-folders)
 * @param folderId UUID of the folder to fetch contents from. If null, fetches home folder contents.
 * @returns Object containing folder contents, loading state, and error
 */
export const useFolderContents = (folderId: string | null = null): FolderContents => {
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
      let items;
      
      if (folderId === null) {
        // Get home folder contents
        items = await ndexClient._httpGetV3ProtectedObj('files/folders/home/list')
      } else {
        // Get specific folder contents
        items = await ndexClient.getFolderList(folderId)
      }
      
      return items || []
    } catch (error) {
      console.error('Error fetching folder contents:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<FolderItemBase[]>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    items: data || [],
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
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
  folderId: string | null = null
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