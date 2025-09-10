// import { getNdexClient } from '@/lib/api/ndex-client-manager'

import { useState } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NetworkSummaryV2 } from '@js4cytoscape/ndex-client'

// Default fallback data
const fallbackData: NetworkSummaryV2[] = []

/**
 * Hook to fetch networks for the authenticated user
 * @param offset The offset for pagination (starting index)
 * @param limit Maximum number of networks to fetch
 * @returns Object containing networks data, loading state, and error
 */
export const useUserNetwork = (offset: number = 0, limit: number = 500) => {
  const config = useConfig()
  const { token, isAuthenticated, user } = useAuth()
  
  // Create a cache key - this tells SWR when to revalidate
  const cacheKey = isAuthenticated && user ? ['accountNetworks', offset, limit, token, user.externalId] : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      // Use cached user UUID instead of calling getCurrentUser()
      const networks = await ndexClient.user.getAccountPageNetworks(user.externalId, offset, limit)
      return networks
    } catch (error) {
      console.error('Error fetching account networks:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<NetworkSummaryV2[]>(
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
      const networks = await ndexClient.networks.v2.getNetworkSummariesByUUIDs(ids)
      return networks
    } catch (error) {
      console.error('Error fetching networks by UUID:', error)
      throw error
    }
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<NetworkSummaryV2[]>(
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
  userExternalId: string,
  offset: number = 0,
  limit: number = 500
): Promise<NetworkSummaryV2[]> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  // Use provided user UUID instead of calling getCurrentUser()
  return ndexClient.user.getAccountPageNetworks(userExternalId, offset, limit)
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
): Promise<NetworkSummaryV2> => {
  const ndexClient = getNdexClient(ndexBaseUrl, token)
  const response = await ndexClient.networks.v2.getNetworkSummariesByUUIDs([networkId])
  if (!response || response.length === 0) {
    throw new Error(`Network with ID ${networkId} not found`)
  }
  return response[0]
}
