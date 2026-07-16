import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { isExpectedViewError } from '@/lib/utils/ndex-errors'
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
 * SWR cache keys for folder data.
 *
 * The key shape is load-bearing: mutate() filters elsewhere pattern-match on
 * ['folderContents', folderId, token] (token at index 2), so token must stay
 * in that position. Keys are null while Keycloak is still restoring the
 * session — fetching before auth state is known would fire a throwaway
 * anonymous request (and a spurious 401 on private folders).
 */
export const folderContentsKey = (
  folderId: string | null,
  token: string,
  accessKey: string | undefined,
  isInitializing: boolean,
): [string, string | null, string, string | null] | null =>
  isInitializing ? null : ['folderContents', folderId, token, accessKey ?? null]

export const folderKey = (
  folderId: string | null,
  token: string,
  accessKey: string | undefined,
  isInitializing: boolean,
): [string, string, string, string | null] | null =>
  folderId === null || isInitializing
    ? null
    : ['folder', folderId, token, accessKey ?? null]

/**
 * Hook to fetch contents of a folder (networks and sub-folders).
 *
 * Works for every viewer: the current token (empty when anonymous) and the
 * optional access key are simply passed through — the server decides what the
 * caller may see. 401/403/404 are expected view states surfaced via `error`.
 *
 * @param folderId UUID of the folder to fetch contents from. If null, fetches
 *   home folder contents (only meaningful for signed-in users).
 * @param accessKey Optional access key granting READ on the folder.
 * @returns Object containing folder contents, loading state, and error
 */
export const useFolderContents = (
  folderId: string | null = null,
  accessKey?: string,
): FolderContents => {
  const config = useConfig()
  const { token, isInitializing } = useAuth()

  const cacheKey = folderContentsKey(folderId, token, accessKey, isInitializing)

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const items = (await ndexClient.files.getFolderList(
        folderId === null ? 'home' : folderId,
        accessKey,
        'compact',
      )) as unknown as FileItemBase[]
      return items || []
    } catch (error) {
      // Permission-denied / not-found are expected, user-facing states the
      // view renders as messages — don't log them as application errors.
      if (!isExpectedViewError(error)) {
        console.error('Error fetching folder contents:', error)
      }
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
      // The cache key changes when auth resolves (token appears); keep showing
      // the previous listing instead of flashing a loading state.
      keepPreviousData: true,
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
  const { token, isAuthenticated, isInitializing } = useAuth()

  const cacheKey = folderKey(folderId, token, accessKey, isInitializing)

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)

    try {
      if (folderId) {
        return await ndexClient.files.getFolder(folderId, accessKey)
      }
      return null
    } catch (error) {
      if (!isExpectedViewError(error)) {
        console.error('Error fetching folder:', error)
      }
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
      keepPreviousData: true,
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
      const result = await ndexClient.files.createFolder(name, parentFolderId || undefined)
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) =>
        Array.isArray(key) &&
        key[0] === 'folderContents' &&
        key[1] === parentFolderId &&
        key[2] === token
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
   * @param folderData Object containing folder properties to update
   * @param folderData.name Updated name
   * @param folderData.description Updated description
   * @param folderData.parent Updated parent folder ID (undefined for home folder)
   * @returns Promise that resolves when the folder is updated
   */
  const updateFolder = async (
    folderIdToUpdate: string,
    folderData: {
      name: string
      description: string
      parent?: string
    }
  ): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update folders')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.updateFolder(
        folderIdToUpdate,
        folderData
      )

      // If this is the folder we're currently viewing, refresh it
      if (folderId === folderIdToUpdate) {
        await refresh()
      }

      // Refresh parent folder contents if it's being viewed
      globalMutate((key) =>
        Array.isArray(key) &&
        key[0] === 'folderContents' &&
        key[1] === folderData.parent &&
        key[2] === token
      )
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
        key[1] === parentFolderId &&
        key[2] === token
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