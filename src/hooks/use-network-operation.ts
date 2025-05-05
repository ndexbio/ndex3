import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'
import { FileType } from '@/types/api/ndex'

// Define Network interface
export interface Network extends FileItemBase {
  parent: string
  // Additional network-specific properties can be added here
}

/**
 * Hook to fetch and manage network operations
 * @param networkId UUID of the network to fetch. If null, only creates hook functions.
 * @param accessKey Optional access key for shared networks
 * @returns Object containing network data, loading state, and operation functions
 */
export const useNetworkOperation = (
  networkId: string | null = null,
  accessKey?: string
) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = networkId 
    ? isAuthenticated 
      ? ['network', networkId, token, accessKey] 
      : ['network', networkId, accessKey]
    : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    
    try {
      if (networkId) {
        // Get network summary
        // Assuming there's a getNetwork method, otherwise this needs to be adjusted
        return await ndexClient.getNetwork(networkId, accessKey)
      }
      return null
    } catch (error) {
      console.error('Error fetching network:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading, mutate } = useSWR<Network | null>(
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
   * Moves networks to a different folder
   * @param networkIds Array of network IDs to move
   * @param targetFolderId Target folder ID
   * @returns Promise that resolves when operation is complete
   */
  const moveNetworks = async (
    networkIds: string[],
    targetFolderId: string
  ): Promise<any> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to move networks')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.moveNetworks(networkIds, targetFolderId)
      
      // If we're moving the current network, refresh it
      if (networkId && networkIds.includes(networkId)) {
        await refresh()
      }
      
      // Get source folder IDs to refresh them
      if (data) {
        // Refresh the source folder contents
        globalMutate((key) => 
          Array.isArray(key) && 
          key[0] === 'folderContents' && 
          key[1] === data.parent
        )
      }
      
      // Refresh target folder contents
      globalMutate((key) => 
        Array.isArray(key) && 
        key[0] === 'folderContents' && 
        key[1] === targetFolderId
      )
      
      return result
    } catch (error) {
      console.error('Error moving networks:', error)
      throw error
    }
  }

  /**
   * Downloads a network in CX format
   * @param networkIdToDownload ID of the network to download
   * @param networkAccessKey Optional access key for shared networks
   * @returns Promise that resolves to the raw network data
   */
  const downloadRawNetwork = async (
    networkIdToDownload: string,
    networkAccessKey?: string
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.getRawNetwork(networkIdToDownload, networkAccessKey)
    } catch (error) {
      console.error('Error downloading raw network:', error)
      throw error
    }
  }

  /**
   * Downloads a network in CX2 format
   * @param networkIdToDownload ID of the network to download
   * @param networkAccessKey Optional access key for shared networks
   * @returns Promise that resolves to the CX2 network data
   */
  const downloadCX2Network = async (
    networkIdToDownload: string,
    networkAccessKey?: string
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.getCX2Network(networkIdToDownload, networkAccessKey)
    } catch (error) {
      console.error('Error downloading CX2 network:', error)
      throw error
    }
  }

  /**
   * Updates a network with raw CX2 data
   * @param networkIdToUpdate ID of the network to update
   * @param rawCX2 The raw CX2 data for the update
   * @returns Promise that resolves when update is complete
   */
  const updateNetworkWithCX2 = async (
    networkIdToUpdate: string,
    rawCX2: any
  ): Promise<any> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update networks')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.updateNetworkFromRawCX2(networkIdToUpdate, rawCX2)
      
      // If this is the network we're currently viewing, refresh it
      if (networkId === networkIdToUpdate) {
        await refresh()
      }
      
      // If we have the current network data, refresh its parent folder
      if (data && data.parent) {
        globalMutate((key) => 
          Array.isArray(key) && 
          key[0] === 'folderContents' && 
          key[1] === data.parent
        )
      }
      
      return result
    } catch (error) {
      console.error('Error updating network:', error)
      throw error
    }
  }

  /**
   * Deletes a network
   * @param networkIdToDelete ID of the network to delete
   * @returns Promise that resolves when deletion is complete
   */
  const deleteNetwork = async (networkIdToDelete: string): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to delete networks')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      
      // Get the network data first (to know its parent) if not the current one
      let parentFolderId
      
      if (networkId === networkIdToDelete && data) {
        parentFolderId = data.parent
      } else {
        // Assuming there's a getNetwork method, otherwise this needs to be adjusted
        const networkData = await ndexClient.getNetworkV3Summary(networkIdToDelete)
        parentFolderId = networkData.parent
      }
      
      // Delete the network
      // Assuming there's a deleteNetwork method, otherwise this needs to be adjusted
      await ndexClient.deleteNetwork(networkIdToDelete)
      
      // Refresh parent folder contents if it's being viewed
      if (parentFolderId) {
        globalMutate((key) => 
          Array.isArray(key) && 
          key[0] === 'folderContents' && 
          key[1] === parentFolderId
        )
      }
      
    } catch (error) {
      console.error('Error deleting network:', error)
      throw error
    }
  }

  return {
    network: data,
    isLoading,
    error,
    refresh,
    moveNetworks,
    downloadRawNetwork,
    downloadCX2Network,
    updateNetworkWithCX2,
    deleteNetwork,
  }
}

/**
 * Helper function to fetch network directly without hook
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param networkId UUID of the network to fetch
 * @param accessKey Optional access key for shared networks
 * @returns Promise that resolves to network data
 */
export const fetchNetwork = async (
  ndexBaseUrl: string,
  token: string,
  networkId: string,
  accessKey?: string
): Promise<Network> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  // Assuming there's a getNetwork method, otherwise this needs to be adjusted
  return ndexClient.getNetwork(networkId, accessKey)
}
