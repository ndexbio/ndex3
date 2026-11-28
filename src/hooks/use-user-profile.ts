import useSWR from 'swr'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { UserProfileData, UserProfileError } from '@/types/ui/userProfile'

/**
 * Hook to fetch user profile data
 * @param uuid - User UUID to fetch profile for
 * @returns User profile data, loading state, and error
 */
export function useUserProfile(uuid: string) {
  const config = useConfig()
  const { token } = useAuth()

  const { data: user, error, isLoading, mutate } = useSWR(
    uuid ? [`user-profile`, uuid] : null,
    async ([, userUuid]) => {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      return await ndexClient.user.getUser(userUuid)
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 2,
    }
  )

  // Transform error to our custom error type
  let transformedError: UserProfileError | null = null
  if (error) {
    if (error.status === 404) {
      transformedError = {
        status: 404,
        message: 'User not found',
        type: 'NOT_FOUND'
      }
    } else if (error.status === 403) {
      transformedError = {
        status: 403,
        message: 'User profile is private',
        type: 'PRIVATE'
      }
    } else if (error.status === 401) {
      transformedError = {
        status: 401,
        message: 'Unauthorized access',
        type: 'UNAUTHORIZED'
      }
    } else {
      transformedError = {
        status: error.status || 500,
        message: error.message || 'Failed to load user profile',
        type: 'NETWORK_ERROR'
      }
    }
  }

  return {
    user: user as UserProfileData | undefined,
    isLoading,
    error: transformedError,
    refresh: mutate
  }
}