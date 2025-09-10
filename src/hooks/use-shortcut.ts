import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NDExFileType } from '@js4cytoscape/ndex-client'

// Define types for shortcuts
export interface Shortcut {
  uuid: string
  name: string
  target: string
  parent: string
  modificationTime?: string | Date
  attributes?: {
    [key: string]: string | number | boolean
  }
}

/**
 * Hook to fetch and manage a shortcut
 * @param shortcutId UUID of the shortcut to fetch. If null, only creates hook functions.
 * @param accessKey Optional access key for shared shortcuts
 * @returns Object containing shortcut data, loading state, and CRUD operations
 */
export const useShortcut = (
  shortcutId: string | null = null,
  accessKey?: string
) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = shortcutId 
    ? isAuthenticated 
      ? ['shortcut', shortcutId, token, accessKey] 
      : ['shortcut', shortcutId, accessKey]
    : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    
    try {
      if (shortcutId) {
        return await ndexClient.getShortcut(shortcutId, accessKey)
      }
      return null
    } catch (error) {
      console.error('Error fetching shortcut:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading, mutate } = useSWR<Shortcut | null>(
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
   * Creates a new shortcut
   * @param name Name of the shortcut
   * @param parentFolderId Parent folder ID
   * @param targetId Target ID (network or folder)
   * @returns The created shortcut
   */
  const createShortcut = async (
    name: string,
    parentFolderId: string|null,
    targetId: string,
    targetType: NDExFileType
  ): Promise<Shortcut> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to create shortcuts')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.files.createShortcut(name, parentFolderId, targetId, targetType )
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === parentFolderId
      )
      
      return result
    } catch (error) {
      console.error('Error creating shortcut:', error)
      throw error
    }
  }

  /**
   * Updates an existing shortcut
   * @param shortcutIdToUpdate ID of the shortcut to update
   * @param name Updated name
   * @param parentFolderId Updated parent folder ID
   * @param targetId Updated target ID
   * @returns The updated shortcut
   */
  const updateShortcut = async (
    shortcutIdToUpdate: string,
    name: string,
    parentFolderId: string,
    targetId: string
  ): Promise<Shortcut> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update shortcuts')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.files.updateShortcut(
        shortcutIdToUpdate,
        name,
        parentFolderId,
        targetId
      )
      
      // If this is the shortcut we're currently viewing, refresh it
      if (shortcutId === shortcutIdToUpdate) {
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
      console.error('Error updating shortcut:', error)
      throw error
    }
  }

  /**
   * Deletes a shortcut
   * @param shortcutIdToDelete ID of the shortcut to delete
   * @returns Promise that resolves when deletion is complete
   */
  const deleteShortcut = async (shortcutIdToDelete: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to delete shortcuts')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      
      // Get the shortcut data first (to know its parent) if not the current one
      let parentFolderId
      
      if (shortcutId === shortcutIdToDelete && data) {
        parentFolderId = data.parent
      } else {
        const shortcutData = await ndexClient.files.getShortcut(shortcutIdToDelete)
        parentFolderId = shortcutData.parent
      }
      
      // Delete the shortcut
      await ndexClient.files.deleteShortcut(shortcutIdToDelete)
      
      // Refresh parent folder contents if it's being viewed
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === parentFolderId
      )
      
    } catch (error) {
      console.error('Error deleting shortcut:', error)
      throw error
    }
  }

  return {
    shortcut: data,
    isLoading,
    error,
    refresh,
    createShortcut,
    updateShortcut,
    deleteShortcut,
  }
}

/**
 * Helper function to fetch shortcut directly without hook
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param shortcutId UUID of the shortcut to fetch
 * @param accessKey Optional access key for shared shortcuts
 * @returns Promise that resolves to shortcut data
 */
export const fetchShortcut = async (
  ndexBaseUrl: string,
  token: string,
  shortcutId: string,
  accessKey?: string
): Promise<Shortcut> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  return ndexClient.getShortcut(shortcutId, accessKey)
}
