import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'

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
  accessKey?: string,
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
        // Get network summary using new client API
        return await ndexClient.networks.v2.getNetworkSummary(networkId, { accesskey: accessKey })
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
    },
  )

  // Function to manually refresh the data
  const refresh = async () => {
    if (cacheKey) {
      await mutate()
    }
  }

  /**
   * Gets network summary in specified format
   * @param networkIdToFetch ID of the network to fetch
   * @param summaryAccessKey Optional access key for shared networks
   * @param format Format of the summary (defaults to "FULL")
   * @returns Promise that resolves to the network summary data
   */
  const getNetworkSummary = async (
    networkIdToFetch: string,
    summaryAccessKey?: string,
    format?: string,
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.networks.getNetworkSummary(
        networkIdToFetch,
        { accesskey: summaryAccessKey }
      )
    } catch (error) {
      console.error('Error fetching network summary:', error)
      throw error
    }
  }

  /**
   * Copies a network
   * @param networkIdToCopy ID of the network to copy
   * @returns Promise that resolves when operation is complete
   */
  const copyNetwork = async (
    networkIdToCopy: string,
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.networks.v2.copyNetwork(networkIdToCopy)
    } catch (error) {
      console.error('Error copying network:', error)
    }
  }

  /**
   * Gets the DOI of a network
   * @param networkId ID of the network to get DOI for
   * @returns Promise that resolves to the network DOI
   */
  const getNetworkDOI = async (networkId:string): Promise<string> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      // TODO: New API requires key and email parameters for DOI creation
      // This needs to be updated to collect user input
      throw new Error('DOI creation requires additional parameters in new API')
    } catch (error) {
      console.error('Error fetching network DOI:', error)       
      return ''
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
    targetFolderId: string,
  ): Promise<any> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to move networks')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.networks.moveNetworks(networkIds, targetFolderId)

      // If we're moving the current network, refresh it
      if (networkId && networkIds.includes(networkId)) {
        await refresh()
      }

      // Get source folder IDs to refresh them
      if (data) {
        // Refresh the source folder contents
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === 'folderContents' &&
            key[1] === data.parent,
        )
      }

      // Refresh target folder contents
      globalMutate(
        (key) =>
          Array.isArray(key) &&
          key[0] === 'folderContents' &&
          key[1] === targetFolderId,
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
    networkAccessKey?: string,
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.networks.getRawCX1Network(
        networkIdToDownload,
        { accesskey: networkAccessKey }
      )
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
    networkAccessKey?: string,
  ): Promise<any> => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.networks.getRawCX2Network(
        networkIdToDownload,
        { accesskey: networkAccessKey }
      )
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
    rawCX2: any,
  ): Promise<any> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required to update networks')
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const result = await ndexClient.networks.updateNetworkFromRawCX2(
        networkIdToUpdate,
        rawCX2
      )

      // If this is the network we're currently viewing, refresh it
      if (networkId === networkIdToUpdate) {
        await refresh()
      }

      // If we have the current network data, refresh its parent folder
      if (data && data.parent) {
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === 'folderContents' &&
            key[1] === data.parent,
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
        const networkData = await ndexClient.networks.getNetworkSummary(
          networkIdToDelete
        )
        parentFolderId = networkData.parent
      }

      // Delete the network
      await ndexClient.networks.deleteNetwork(networkIdToDelete)

      // Refresh parent folder contents if it's being viewed
      if (parentFolderId) {
        globalMutate(
          (key) =>
            Array.isArray(key) &&
            key[0] === 'folderContents' &&
            key[1] === parentFolderId,
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
    getNetworkSummary,
    copyNetwork,
    getNetworkDOI,
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
  accessKey?: string,
): Promise<Network> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  return ndexClient.networks.v2.getNetworkSummary(networkId, { accesskey: accessKey })
}
