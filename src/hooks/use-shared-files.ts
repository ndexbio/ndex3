import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'

export interface SharedContents {
  items: FileItemBase[]
  isLoading: boolean
  error: Error | null
  isEmpty: boolean
  refresh: () => Promise<void>
}

/**
 * Hook to fetch shared files (networks and folders shared with the current user)
 * @returns Object containing shared files, loading state, and error
 */
export const useSharedFiles = (): SharedContents => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Create a cache key for revalidation
  const cacheKey = isAuthenticated ? ['sharedFiles', token] : null

  // Fetcher function that uses ndexClient
  const fetcher = async (): Promise<FileItemBase[]> => {
    if (!isAuthenticated) {
      return []
    }

    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      // Get items shared with the current user
      const items = await ndexClient.files.listShares()

      // Map FileListItem[] to FileItemBase[] to ensure consistent interface
      return (items || []).map((item: any) => ({
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        modificationTime: item.modificationTime || item.modifiedTime || item.creationTime,
        // Top-level attributes (moved from nested in ndex-client v2)
        owner: item.owner,
        ownerUUID: item.ownerUUID,
        visibility: item.visibility,
        updatedBy: item.updatedBy,
        edges: item.edges,
        permission: item.permission,
        attributes: {
          ...item.attributes,
          // Shortcut-specific attributes mapping
          ...(item.type === 'SHORTCUT' && {
            target: item.attributes?.target || item.target,
            target_type: item.attributes?.target_type || item.targetType,
          }),
        }
      }))
    } catch (error) {
      console.error('Error fetching shared items:', error)
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