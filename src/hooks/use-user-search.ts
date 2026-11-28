import { useConfig } from '@/lib/contexts/ConfigContext'
import { UserSearchParams, UserSearchResponse } from '../types/api/ndex'
import { mapNDExUserToUser } from '../types/api/ndex/User'
import { getNdexClient } from '../lib/api/ndex-client-manager'
import useSWR from 'swr'

const EMPTY_USER_RESULT: UserSearchResponse = {
  resultList: [],
  numFound: 0,
  start: 0,
}
const createFetcher = (baseUrl: string) => async (params: UserSearchParams): Promise<UserSearchResponse> => {
  const ndexClient = getNdexClient(baseUrl)

  const result = await ndexClient.user.searchUsers(
    params.searchString || '',
    0, // start
    2000 // size
  )

  return {
    resultList: result.ResultList.map(mapNDExUserToUser),
    numFound: result.numFound,
    start: result.start,
  }
}

export const useUserSearch = (params: UserSearchParams) => {
  const config = useConfig()
  const fetcher = createFetcher(config.ndexBaseUrl)
  
  // Create a cache key that changes when any relevant param changes
  const cacheKey = JSON.stringify({
    searchString: params.searchString || '',
    start: 0,
    size: 2000,
  })

  const { data, error, isLoading } = useSWR<UserSearchResponse, Error>(
    cacheKey,
    () => fetcher(params),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
      fallbackData: EMPTY_USER_RESULT,
      keepPreviousData: false,
      suspense: false,
      revalidateOnMount: true,
    },
  )

  return {
    users: data?.resultList || [],
    error,
    isLoading,
    total: data?.numFound || 0,
  }
}
