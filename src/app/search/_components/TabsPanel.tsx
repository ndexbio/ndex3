'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NetworkTable } from './NetworkTable'
import { useNetworkSearch } from '@/hooks/use-network-search'
import { useSearchStore } from '@/stores/search-store'
import { useEffect } from 'react'
import { useUserSearch } from '@/hooks/use-user-search'
import { UserTable } from './UserTable'
// import { SidebarTrigger } from '@/components/ui/sidebar'

export function TabsPanel() {
  const { query } = useSearchStore()

  const { networks, error, isLoading, hasMore, loadMore, totalCount } =
    useNetworkSearch({
      searchString: query || '',
    })
  const {
    users,
    error: userError,
    isLoading: isUserLoading,
    total: userTotalCount,
  } = useUserSearch({
    searchString: query || '',
  })

  useEffect(() => {
    console.log('Query changed in TabsPanel:', query)
  }, [query])

  return (
    <Tabs defaultValue="networks" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="networks">
          Networks ({totalCount ?? '-'})
        </TabsTrigger>
        <TabsTrigger value="collections">
          Users ({userTotalCount ?? '-'})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="networks">
        <div className="p-4">
          {isLoading && <p>Loading networks...</p>}
          {error && (
            <p className="text-red-500">
              Error loading networks: {error.message}
            </p>
          )}
          <NetworkTable
            networks={networks}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            totalCount={totalCount}
          />
        </div>
      </TabsContent>
      <TabsContent value="collections">
        <div className="p-4">
          <UserTable
            users={users}
            error={userError}
            isLoading={isUserLoading}
            hasMore={false}
            loadMore={() => {}}
            totalCount={userTotalCount}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
