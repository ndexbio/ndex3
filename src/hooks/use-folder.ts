import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'

interface FolderContents {
  items: FileItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  refresh: () => Promise<void>
}

// Define type for folder
export interface Folder extends FileItemBase {
  parent: string
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
        items = await ndexClient.files.getFolderList('home', undefined, 'compact')
      } else {
        // Get specific folder contents
        items = await ndexClient.files.getFolderList(folderId, undefined, 'compact')
      }

      return items || []
    } catch (error) {
      console.error('Error fetching folder contents:', error)
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

  return {
    items: data || [],
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
    refresh,
  }
}

/**
 * Hook to fetch and manage a folder
 * @param folderId UUID of the folder to fetch. If null, only creates hook functions.
 * @param accessKey Optional access key for shared folders
 * @returns Object containing folder data, loading state, and CRUD operations
 */
export const useFolder = (
  folderId: string | null = null,
  accessKey?: string
) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = folderId 
    ? isAuthenticated 
      ? ['folder', folderId, token, accessKey] 
      : ['folder', folderId, accessKey]
    : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    
    try {
      if (folderId) {
        return await ndexClient.files.getFolder(folderId, accessKey)
      }
      return null
    } catch (error) {
      console.error('Error fetching folder:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading, mutate } = useSWR<Folder | null>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  // Function to manually refresh the data
  const refresh = async () => {
    if (cacheKey) {
      await mutate()
    }
  }

  /**
   * Creates a new folder
   * @param name Name of the folder
   * @param parentFolderId Parent folder ID
   * @returns The created folder
   */
  const createFolder = async (
    name: string,
    parentFolderId: string|null
  ): Promise<Folder> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to create folders')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.files.createFolder(name, parentFolderId)
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === parentFolderId
      )
      
      return result
    } catch (error) {
      console.error('Error creating folder:', error)
      throw error
    }
  }

  /**
   * Updates an existing folder
   * @param folderIdToUpdate ID of the folder to update
   * @param name Updated name
   * @param parentFolderId Updated parent folder ID
   * @returns The updated folder
   */
  const updateFolder = async (
    folderIdToUpdate: string,
    name: string,
    parentFolderId: string
  ): Promise<Folder> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update folders')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.files.updateFolder(
        folderIdToUpdate,
        name,
        parentFolderId
      )
      
      // If this is the folder we're currently viewing, refresh it
      if (folderId === folderIdToUpdate) {
        await refresh()
      }
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === parentFolderId
      )
      
      return result
    } catch (error) {
      console.error('Error updating folder:', error)
      throw error
    }
  }

  /**
   * Deletes a folder
   * @param folderIdToDelete ID of the folder to delete
   * @returns Promise that resolves when deletion is complete
   */
  const deleteFolder = async (folderIdToDelete: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to delete folders')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      
      // Get the folder data first (to know its parent) if not the current one
      let parentFolderId
      
      if (folderId === folderIdToDelete && data) {
        parentFolderId = data.parent
      } else {
        const folderData = await ndexClient.files.getFolder(folderIdToDelete)
        parentFolderId = folderData.parent
      }

      // Delete the folder
      await ndexClient.files.deleteFolder(folderIdToDelete)
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === parentFolderId
      )
      
    } catch (error) {
      console.error('Error deleting folder:', error)
      throw error
    }
  }

  return {
    folder: data,
    isLoading,
    error,
    refresh,
    createFolder,
    updateFolder,
    deleteFolder,
  }
}

/**
 * Helper function to fetch folder contents directly
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param folderId UUID of the folder to fetch. If null, fetches home folder.
 * @returns Promise that resolves to folder contents
 */
export const fetchFolderContents = async (
  ndexBaseUrl: string,
  token: string,
  folderId: string | null = null,
): Promise<FileItemBase[]> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)

  if (folderId === null) {
    // Get home folder contents
    return ndexClient._httpGetV3ProtectedObj('files/folders/home/list')
  } else {
    // Get specific folder contents
    return ndexClient.files.getFolderList(folderId)
  }
}

/**
 * Helper function to fetch folder directly without hook
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param folderId UUID of the folder to fetch
 * @param accessKey Optional access key for shared folders
 * @returns Promise that resolves to folder data
 */
export const fetchFolder = async (
  ndexBaseUrl: string,
  token: string,
  folderId: string,
  accessKey?: string
): Promise<Folder> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  return ndexClient.files.getFolder(folderId, accessKey)
}
