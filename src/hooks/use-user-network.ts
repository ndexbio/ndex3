// import { getNdexClient } from '@/lib/api/ndex-client-manager'

import { useState } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NetworkSummary } from '@/types/api/ndex/NetworkSummary'

// Default fallback data
const fallbackData: NetworkSummary[] = []

/**
 * Hook to fetch networks for the authenticated user
 * @param offset The offset for pagination (starting index)
 * @param limit Maximum number of networks to fetch
 * @returns Object containing networks data, loading state, and error
 */
export const useUserNetwork = (offset: number = 0, limit: number = 500) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()
  
  // Create a cache key - this tells SWR when to revalidate
  const cacheKey = isAuthenticated ? ['accountNetworks', offset, limit, token] : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const networks = await ndexClient.getAccountPageNetworks(offset, limit)
      return networks
    } catch (error) {
      console.error('Error fetching account networks:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<NetworkSummary[]>(
    cacheKey,
    fetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    data,
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
  }
}




/**
 * Hook to fetch specific networks by their UUIDs
 * @param networkIds Single network UUID or array of UUIDs
 * @returns Object containing network data, loading state, and error
 */
export const useNetwork = (networkIds: string | string[]) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()
  const ids = Array.isArray(networkIds) ? networkIds : [networkIds]
  
  // Only create a cache key if we have network IDs and are authenticated
  const cacheKey = ids.length > 0 && isAuthenticated 
    ? ['networks', ids.join(','), token] 
    : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const networks = await ndexClient.getNetworkSummariesByUUIDs(ids)
      return networks
    } catch (error) {
      console.error('Error fetching networks by UUID:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<NetworkSummary[]>(
    cacheKey,
    fetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    data,
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
  }
}

/**
 * Helper function to fetch user networks directly
 * @param ndexBaseUrl The NDEx API base URL
 * @param token The authentication token
 * @param offset Starting position for pagination
 * @param limit Maximum number of networks to fetch
 * @returns Promise that resolves to user networks
 */
export const fetchUserNetworks = async (
  ndexBaseUrl: string,
  token: string,
  offset: number = 0,
  limit: number = 500
): Promise<NetworkSummary[]> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  return ndexClient.getAccountPageNetworks(offset, limit)
}

/**
 * Helper function to fetch a network by its UUID
 * @param ndexBaseUrl The NDEx API base URL
 * @param networkId The UUID of the network to fetch
 * @param token The authentication token (optional)
 * @returns Promise that resolves to the network
 */
export const fetchNetworkById = async (
  ndexBaseUrl: string,
  networkId: string,
  token?: string
): Promise<NetworkSummary> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  const response = await ndexClient.getNetworkSummariesByUUIDs([networkId])
  if (!response || response.length === 0) {
    throw new Error(`Network with ID ${networkId} not found`)
  }
  return response[0]
}
