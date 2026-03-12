import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'
import { FileListItem, FileSearchResult as NDExFileSearchResult } from '@js4cytoscape/ndex-client'

const MY_NETWORKS_PAGE_SIZE = 3000
const PUBLIC_PRIVATE_PAGE_SIZE = 500

/**
 * Maps a FileListItem from the API to the internal FileItemBase type.
 */
function mapFileListItemToFileItemBase(item: FileListItem): FileItemBase {
  return {
    uuid: item.uuid,
    name: item.name || '',
    type: item.type,
    modificationTime: item.modificationTime,
    owner: item.owner,
    ownerUUID: item.ownerUUID || (item as any).owner_id,
    visibility: item.visibility,
    updatedBy: item.updatedBy,
    edges: item.edges,
    permission: item.permission,
    attributes: {
      ...item.attributes,
      isReadOnly: item.isReadOnly,
      isValid: item.isValid,
      isCompleted: item.isCompleted,
      errorMessage: item.errorMessage,
      warnings: item.warnings,
      DOI: item.DOI,
      isShared: item.isShared,
    },
  }
}

export interface FileSearchTabResult {
  items: FileItemBase[]
  numFound: number
  isLoading: boolean
  error: Error | null
  hasMore?: boolean
  loadMore?: () => void
}

export interface MyNetworksResult {
  items: FileItemBase[]
  numFound: number
  loadedCount: number
  isTruncated: boolean
  isLoading: boolean
  publicError: Error | null
  privateError: Error | null
  hasAnyError: boolean
  retryPublic: () => void
  retryPrivate: () => void
}

export interface UseFileSearchResult {
  myNetworks: MyNetworksResult
  publicResults: FileSearchTabResult & { hasMore: boolean; loadMore: () => void }
  privateResults: FileSearchTabResult & { hasMore: boolean; loadMore: () => void }
}

/**
 * Hook for file search using the v3 searchFiles API.
 * Fires parallel API calls based on auth state.
 *
 * Signed-in users: 4 file search calls (2 for My Networks + 1 Public + 1 Private)
 * Anonymous users: 1 file search call (Public only)
 */
export function useFileSearch(query: string): UseFileSearchResult {
  const config = useConfig()
  const { token, isAuthenticated, user } = useAuth()
  const isEmptyQuery = !query || query.trim() === ''
  const accountName = user?.userName || null

  // --- My Networks: Public + Private with accountName (single fetch each) ---
  const myNetworksPublicKey = !isEmptyQuery && isAuthenticated && accountName
    ? ['fileSearch', 'myNetworks', 'PUBLIC', query, accountName, token]
    : null

  const myNetworksPrivateKey = !isEmptyQuery && isAuthenticated && accountName
    ? ['fileSearch', 'myNetworks', 'PRIVATE', query, accountName, token]
    : null

  const myNetworksPublicFetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    const result = await ndexClient.files.searchFiles({
      searchString: query,
      visibility: 'PUBLIC',
      accountName: accountName!,
      size: MY_NETWORKS_PAGE_SIZE,
      start: 0,
    })
    return result
  }

  const myNetworksPrivateFetcher = async () => {
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    const result = await ndexClient.files.searchFiles({
      searchString: query,
      visibility: 'PRIVATE',
      accountName: accountName!,
      size: MY_NETWORKS_PAGE_SIZE,
      start: 0,
    })
    return result
  }

  const {
    data: myPubData,
    error: myPubError,
    isLoading: myPubLoading,
    mutate: retryMyPub,
  } = useSWR<NDExFileSearchResult>(myNetworksPublicKey, myNetworksPublicFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
  })

  const {
    data: myPrivData,
    error: myPrivError,
    isLoading: myPrivLoading,
    mutate: retryMyPriv,
  } = useSWR<NDExFileSearchResult>(myNetworksPrivateKey, myNetworksPrivateFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
  })

  // Merge My Networks results, sorted by modificationTime desc
  const myNetworksMerged = (() => {
    const pubItems = myPubData ? myPubData.files.map(mapFileListItemToFileItemBase) : []
    const privItems = myPrivData ? myPrivData.files.map(mapFileListItemToFileItemBase) : []
    const merged = [...pubItems, ...privItems]
    merged.sort((a, b) => {
      const timeA = typeof a.modificationTime === 'number' ? a.modificationTime : new Date(a.modificationTime).getTime()
      const timeB = typeof b.modificationTime === 'number' ? b.modificationTime : new Date(b.modificationTime).getTime()
      return timeB - timeA
    })
    return merged
  })()

  const myNetworksNumFound = (myPubData?.numFound ?? 0) + (myPrivData?.numFound ?? 0)
  const myNetworksLoadedCount = myNetworksMerged.length
  const myNetworksIsTruncated =
    (myPubData ? myPubData.files.length < myPubData.numFound : false) ||
    (myPrivData ? myPrivData.files.length < myPrivData.numFound : false)

  // --- Public results: infinite scroll ---
  const publicGetKey = (pageIndex: number, previousPageData: NDExFileSearchResult | null) => {
    if (isEmptyQuery) return null
    if (previousPageData && previousPageData.numFound <= pageIndex * PUBLIC_PRIVATE_PAGE_SIZE) return null
    return ['fileSearch', 'public', query, pageIndex, token || 'anon']
  }

  const publicFetcher = async (key: any[]) => {
    const pageIndex = key[3] as number
    const ndexClient = getNdexClient(config.ndexBaseUrl)
    return ndexClient.files.searchFiles({
      searchString: query,
      visibility: 'PUBLIC',
      start: pageIndex * PUBLIC_PRIVATE_PAGE_SIZE,
      size: PUBLIC_PRIVATE_PAGE_SIZE,
    })
  }

  const {
    data: publicData,
    error: publicError,
    isLoading: publicLoading,
    size: publicSize,
    setSize: setPublicSize,
  } = useSWRInfinite<NDExFileSearchResult>(publicGetKey, publicFetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
  })

  const publicItems = publicData
    ? publicData.flatMap(page => page.files.map(mapFileListItemToFileItemBase))
    : []
  const publicNumFound = publicData?.[0]?.numFound ?? 0
  const publicHasMore = publicSize * PUBLIC_PRIVATE_PAGE_SIZE < publicNumFound

  // --- Private results: infinite scroll (only for authenticated users) ---
  const privateGetKey = (pageIndex: number, previousPageData: NDExFileSearchResult | null) => {
    if (isEmptyQuery || !isAuthenticated) return null
    if (previousPageData && previousPageData.numFound <= pageIndex * PUBLIC_PRIVATE_PAGE_SIZE) return null
    return ['fileSearch', 'private', query, pageIndex, token]
  }

  const privateFetcher = async (key: any[]) => {
    const pageIndex = key[3] as number
    const ndexClient = getNdexClient(config.ndexBaseUrl, token)
    return ndexClient.files.searchFiles({
      searchString: query,
      visibility: 'PRIVATE',
      start: pageIndex * PUBLIC_PRIVATE_PAGE_SIZE,
      size: PUBLIC_PRIVATE_PAGE_SIZE,
    })
  }

  const {
    data: privateData,
    error: privateError,
    isLoading: privateLoading,
    size: privateSize,
    setSize: setPrivateSize,
  } = useSWRInfinite<NDExFileSearchResult>(privateGetKey, privateFetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
    shouldRetryOnError: true,
    errorRetryCount: 3,
  })

  const privateItems = privateData
    ? privateData.flatMap(page => page.files.map(mapFileListItemToFileItemBase))
    : []
  const privateNumFound = privateData?.[0]?.numFound ?? 0
  const privateHasMore = privateSize * PUBLIC_PRIVATE_PAGE_SIZE < privateNumFound

  return {
    myNetworks: {
      items: myNetworksMerged,
      numFound: myNetworksNumFound,
      loadedCount: myNetworksLoadedCount,
      isTruncated: myNetworksIsTruncated,
      isLoading: myPubLoading || myPrivLoading,
      publicError: myPubError ?? null,
      privateError: myPrivError ?? null,
      hasAnyError: !!(myPubError || myPrivError),
      retryPublic: () => retryMyPub(),
      retryPrivate: () => retryMyPriv(),
    },
    publicResults: {
      items: publicItems,
      numFound: publicNumFound,
      isLoading: publicLoading,
      error: publicError ?? null,
      hasMore: publicHasMore,
      loadMore: () => setPublicSize(publicSize + 1),
    },
    privateResults: {
      items: privateItems,
      numFound: privateNumFound,
      isLoading: privateLoading,
      error: privateError ?? null,
      hasMore: privateHasMore,
      loadMore: () => setPrivateSize(privateSize + 1),
    },
  }
}
