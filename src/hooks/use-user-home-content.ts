import useSWR from 'swr'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { FileListItem } from '@/types/ui/userProfile'
import { Visibility } from '@js4cytoscape/ndex-client'

/**
 * Hook to fetch user home content (networks, folders, shortcuts)
 * @param uuid - User UUID to fetch content for
 * @param includePrivate - Whether to include private content (only works if viewing own content)
 * @returns User content data, loading state, and error
 */
export function useUserHomeContent(uuid: string, includePrivate: boolean = false) {
  const config = useConfig()
  const { token, userUuid: currentUserUuid } = useAuth()

  const { data: content, error, isLoading, mutate } = useSWR(
    uuid ? [`user-home-content`, uuid, includePrivate] : null,
    async ([, profileUserUuid]) => {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const rawContent = await ndexClient.user.getUserHomeContent(profileUserUuid, 'compact')
      
      // Filter content based on visibility and user permissions
      // Only show private content if the current user is viewing their own profile
      return filterUserContent(rawContent, includePrivate, currentUserUuid === profileUserUuid)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Cache for 30 seconds
      errorRetryCount: 2,
    }
  )

  return {
    content: content || [],
    isLoading,
    error,
    isEmpty: !isLoading && (!content || content.length === 0),
    refresh: mutate
  }
}

/**
 * Filter user content based on visibility and user permissions
 * @param content - Raw content from API
 * @param includePrivate - Whether to include private content
 * @param isOwnContent - Whether the user is viewing their own content
 * @returns Filtered content array
 */
function filterUserContent(
  content: FileListItem[], 
  includePrivate: boolean, 
  isOwnContent: boolean
): FileListItem[] {
  if (!content) return []

  return content.filter(item => {
    // Always show public content
    const visibility = item.visibility
    if (visibility === Visibility.PUBLIC) {
      return true
    }

    // Show private content only if explicitly requested and user owns the content
    if (includePrivate && isOwnContent) {
      return true
    }

    // For items without explicit visibility, assume they're public if they're in user's home content
    // This is a fallback for older content or different content types
    if (!visibility) {
      return true
    }

    // Hide private content by default
    return false
  })
}

/**
 * Hook to get content statistics for a user
 * @param content - User content array
 * @returns Statistics about user's content
 */
export function useUserContentStats(content: FileListItem[]) {
  const stats = {
    totalItems: content.length,
    networks: content.filter(item => item.type === 'NETWORK').length,
    folders: content.filter(item => item.type === 'FOLDER').length,
    shortcuts: content.filter(item => item.type === 'SHORTCUT').length,
    publicItems: content.filter(item =>
      item.visibility === Visibility.PUBLIC
    ).length,
    privateItems: content.filter(item =>
      item.visibility === Visibility.PRIVATE
    ).length,
  }

  return stats
}