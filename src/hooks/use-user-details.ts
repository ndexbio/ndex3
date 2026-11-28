import { useMemo } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NDExUser } from '@js4cytoscape/ndex-client'

/**
 * Hook to fetch user details by UUIDs using NDEx getUsersByUUIDs API
 * @param userUuids Array of user UUIDs to fetch details for
 * @param isEnabled Whether to enable fetching (for conditional execution)
 * @returns Object containing user details map, loading state, and error
 */
export const useUserDetails = (userUuids: string[], isEnabled: boolean) => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create cache key only when enabled and we have UUIDs
  const cacheKey = useMemo(() => {
    if (!isEnabled || !userUuids.length || !isAuthenticated) {
      return null
    }

    // Create a stable key based on sorted UUIDs
    const sortedUuids = [...userUuids].sort().join(',')
    return ['userDetails', sortedUuids, token]
  }, [userUuids, isEnabled, isAuthenticated, token])

  // Fetcher function
  const fetcher = async () => {
    if (!userUuids.length) {
      return []
    }

    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    return await ndexClient.user.getUsersByUUIDs(userUuids)
  }

  // Use SWR to fetch and cache the data
  const { data, error, isLoading } = useSWR<NDExUser[]>(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes - user data doesn't change often
    }
  )

  // Process the data into a Map for quick lookups
  const userDetailsMap = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return new Map<string, NDExUser>()
    }

    const map = new Map<string, NDExUser>()
    data.forEach(user => {
      // Use externalId as the key to match with userUuid
      map.set(user.externalId, user)
    })

    return map
  }, [data])

  // Extract unique UUIDs for easier access
  const fetchedUuids = useMemo(() => {
    return Array.from(userDetailsMap.keys())
  }, [userDetailsMap])

  return {
    userDetails: userDetailsMap,
    isLoadingUsers: isLoading,
    userError: error?.message || null,
    hasUserData: data !== null && data !== undefined,
    fetchedUuids,
  }
}