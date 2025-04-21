import { useState } from 'react'
import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FolderItemBase } from './use-folder-contents'

export interface SharedContents {
  items: FolderItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
}

/**
 * Hook to fetch shared items (networks and folders shared with the current user)
 * @returns Object containing shared items, loading state, and error
 */
export const useSharedItems = (): SharedContents => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = isAuthenticated ? ['sharedItems', token] : null

  // Fetcher function that uses ndexClient
  const fetcher = async () => {
    if (!isAuthenticated) {
      return []
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      // Get items shared with the current user
      const items = await ndexClient.listShares()
      return items || []
    } catch (error) {
      console.error('Error fetching shared items:', error)
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
    },
  )

  return {
    items: data || [],
    isLoading,
    error,
    isEmpty: !data || data.length === 0,
  }
} 