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
        attributes: {
          ...item.attributes,
          // Network-specific attributes mapping
          ...(item.type === 'NETWORK' && {
            edges: item.attributes?.edges || item.attributes?.edgeCount || item.edgeCount || 0,
            nodes: item.attributes?.nodes || item.attributes?.nodeCount || item.nodeCount || 0,
            edgeCount: item.attributes?.edges || item.attributes?.edgeCount || item.edgeCount || 0,
            nodeCount: item.attributes?.nodes || item.attributes?.nodeCount || item.nodeCount || 0,
            visibility: item.attributes?.visibility || item.visibility || 'PRIVATE',
            owner: item.attributes?.owner || item.owner || item.updatedBy,
            updatedBy: item.updatedBy || item.attributes?.updatedBy,
          }),
          // Folder-specific attributes mapping
          ...(item.type === 'FOLDER' && {
            visibility: item.attributes?.visibility || item.visibility || 'PRIVATE',
            owner: item.attributes?.owner || item.owner || item.updatedBy,
            updatedBy: item.updatedBy || item.attributes?.updatedBy,
          }),
          // Shortcut-specific attributes mapping
          ...(item.type === 'SHORTCUT' && {
            target: item.attributes?.target || item.target,
            target_type: item.attributes?.target_type || item.targetType,
            visibility: item.attributes?.visibility || item.visibility || 'PRIVATE',
            owner: item.attributes?.owner || item.owner || item.updatedBy,
            updatedBy: item.updatedBy || item.attributes?.updatedBy,
          }),
          // Common attributes for all types
          visibility: item.attributes?.visibility || item.visibility || 'PRIVATE',
          owner: item.attributes?.owner || item.owner || item.updatedBy,
          updatedBy: item.updatedBy || item.attributes?.updatedBy,
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