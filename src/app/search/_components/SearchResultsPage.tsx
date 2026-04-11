'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NDExFileType, Visibility } from '@js4cytoscape/ndex-client'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useSearchStore } from '@/stores/search-store'
import { useFileSearch, MyNetworksResult } from '@/hooks/use-file-search'
import { FileItemBase } from '@/types/api/ndex/File'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useShortcut } from '@/hooks/use-shortcut'
import { useToast } from '@/lib/contexts/ToastContext'
import { DialogProvider } from '@/lib/contexts/DialogContext'
import ActionDropdown from '@/app/my-account/_components/ActionDropdown'
import FoldersList from '@/components/shared/FoldersList'
import NetworksList from '@/components/shared/NetworksList'
import { SearchEmptyState } from './SearchEmptyState'

// --- Tab types ---
type SignedInTab = 'my-networks' | 'public' | 'private'

// --- Helper: split items into folders and networks ---
function splitByType(items: FileItemBase[]) {
  const folders: FileItemBase[] = []
  const networks: FileItemBase[] = []
  for (const item of items) {
    if (item.type === NDExFileType.FOLDER || (item.type === NDExFileType.SHORTCUT && item.attributes?.target_type === NDExFileType.FOLDER)) {
      folders.push(item)
    } else {
      networks.push(item)
    }
  }
  return { folders, networks }
}

// --- Inline error component ---
function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-4 border border-destructive/30 bg-destructive/5 rounded-md my-4">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
      <span className="text-sm text-destructive">{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="ml-auto">
          <RefreshCcw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  )
}

// --- Relevance badge ---
function RelevanceBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      Sorted by relevance
    </span>
  )
}

// --- Tab content for file tabs (folders + networks) ---
function FileTabContent({
  items,
  isLoading,
  error,
  sortable,
  showVisibilityColumn = true,
  hasMore,
  loadMore,
  onRetry,
  query,
  onDropdownToggle,
}: {
  items: FileItemBase[]
  isLoading: boolean
  error: Error | null
  sortable: boolean
  showVisibilityColumn?: boolean
  hasMore?: boolean
  loadMore?: () => void
  onRetry?: () => void
  query: string
  onDropdownToggle?: (event: React.MouseEvent, id: string, type: NDExFileType) => void
}) {
  const { folders, networks } = useMemo(() => splitByType(items), [items])

  if (error && items.length === 0) {
    return <InlineError message={`Unable to load results. ${error.message}`} onRetry={onRetry} />
  }

  if (!isLoading && items.length === 0) {
    return <SearchEmptyState type="no-results" query={query} />
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {error && items.length > 0 && (
        <InlineError message="Some results may be missing." onRetry={onRetry} />
      )}
      {folders.length > 0 && (
        <FoldersList
          folders={folders}
          viewMode="list"
          readOnly={true}
          showOwnerColumn={true}
          showVisibilityColumn={showVisibilityColumn}
          sortable={sortable}
          onDropdownToggle={onDropdownToggle}
        />
      )}
      <NetworksList
        items={networks}
        viewMode="list"
        readOnly={true}
        showOwnerColumn={true}
        showVisibilityColumn={showVisibilityColumn}
        sortable={sortable}
        onDropdownToggle={onDropdownToggle}
      />
      {isLoading && (
        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
      )}
      {hasMore && !isLoading && (
        <div className="text-center py-4">
          <Button variant="outline" size="sm" onClick={loadMore}>
            Load more results
          </Button>
        </div>
      )}
    </DndProvider>
  )
}

// --- My Networks tab content ---
function MyNetworksTabContent({
  data,
  query,
  onDropdownToggle,
}: {
  data: MyNetworksResult
  query: string
  onDropdownToggle?: (event: React.MouseEvent, id: string, type: NDExFileType) => void
}) {
  const { folders, networks } = useMemo(() => splitByType(data.items), [data.items])
  const bothFailed = !!(data.publicError && data.privateError)

  if (bothFailed && data.items.length === 0) {
    return (
      <InlineError
        message="Unable to load your networks."
        onRetry={() => { data.retryPublic(); data.retryPrivate() }}
      />
    )
  }

  if (!data.isLoading && data.items.length === 0 && !data.hasAnyError) {
    return <SearchEmptyState type="no-results" query={query} />
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {data.publicError && !data.privateError && (
        <InlineError
          message="Some results may be missing — unable to load public networks."
          onRetry={data.retryPublic}
        />
      )}
      {data.privateError && !data.publicError && (
        <InlineError
          message="Some results may be missing — unable to load private networks."
          onRetry={data.retryPrivate}
        />
      )}
      {data.isTruncated && !data.hasAnyError && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 mb-4">
          Showing {data.loadedCount.toLocaleString()} of {data.numFound.toLocaleString()} results — refine your search to see all matches.
        </div>
      )}
      {folders.length > 0 && (
        <FoldersList
          folders={folders}
          viewMode="list"
          readOnly={true}
          showOwnerColumn={true}
          showVisibilityColumn={true}
          sortable={true}
          defaultSort={{ field: 'modificationTime', direction: 'desc' }}
          onDropdownToggle={onDropdownToggle}
        />
      )}
      <NetworksList
        items={networks}
        viewMode="list"
        readOnly={true}
        showOwnerColumn={true}
        showVisibilityColumn={true}
        sortable={true}
        defaultSort={{ field: 'modificationTime', direction: 'desc' }}
        onDropdownToggle={onDropdownToggle}
      />
      {data.isLoading && (
        <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
      )}
    </DndProvider>
  )
}

// --- Tab count display ---
function TabCount({ count, isTruncated, hasError }: { count: number; isTruncated?: boolean; hasError?: boolean }) {
  if (hasError) return null
  return (
    <span className="text-muted-foreground ml-1">
      ({count.toLocaleString()}{isTruncated ? '+' : ''})
    </span>
  )
}

// --- Main SearchResultsPage (inner content, must be inside DialogProvider) ---
function SearchResultsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const config = useConfig()
  const query = searchParams.get('q') || ''
  const urlTab = searchParams.get('tab') || ''
  const { isAuthenticated, token } = useAuth()
  const { addToHistory } = useSearchStore()
  const { addToast } = useToast()

  // --- Dropdown state ---
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [dropdownType, setDropdownType] = useState<NDExFileType | null>(null)

  // --- Hooks for action callbacks ---
  const { createShortcut } = useShortcut(null)

  // File search (must be before action callbacks that reference results)
  const { myNetworks, publicResults, privateResults } = useFileSearch(query)

  // All search items combined (for finding items by ID in action callbacks)
  const allSearchItems = useMemo(() => [
    ...myNetworks.items,
    ...publicResults.items,
    ...privateResults.items,
  ], [myNetworks.items, publicResults.items, privateResults.items])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openDropdownId) return
      const target = event.target as Element
      if (target.closest('[data-dropdown-menu="true"]')) return
      if (target.closest(`[data-dropdown-id="${openDropdownId}"]`)) return
      setOpenDropdownId(null)
      setDropdownType(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdownId])

  // Toggle dropdown handler
  const handleDropdownToggle = useCallback((
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => {
    event.preventDefault()
    if (openDropdownId === id && dropdownType === type) {
      setOpenDropdownId(null)
      setDropdownType(null)
    } else {
      setOpenDropdownId(id)
      setDropdownType(type)
    }
  }, [openDropdownId, dropdownType])

  const handleCloseDropdown = useCallback(() => {
    setOpenDropdownId(null)
    setDropdownType(null)
  }, [])

  // --- Action callbacks for ActionDropdown ---

  // Move to trash (delete)
  const handleDeleteItems = useCallback(async (itemIds: string[]) => {
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      for (const id of itemIds) {
        const item = allSearchItems.find(i => i.uuid === id)
        if (item?.type === NDExFileType.FOLDER) {
          await ndexClient.files.deleteFolder(id)
        } else if (item?.type === NDExFileType.SHORTCUT) {
          await ndexClient.files.deleteShortcut(id)
        } else {
          await ndexClient.networks.deleteNetwork(id)
        }
      }
      addToast({
        title: 'Moved to trash',
        description: `${itemIds.length} item${itemIds.length > 1 ? 's' : ''} moved to trash`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to move item to trash',
        type: 'error',
        duration: 4000,
      })
    }
    handleCloseDropdown()
  }, [config.ndexBaseUrl, token, allSearchItems, addToast, handleCloseDropdown])

  // Restore (not applicable in search — no-op)
  const handleRestore = useCallback(async () => {
    // No-op: search results are never in trash
  }, [])

  // Create shortcut
  const handleCreateShortcut = useCallback(async (itemId: string, targetFolderId?: string) => {
    if (!isAuthenticated) return
    try {
      const item = allSearchItems.find(i => i.uuid === itemId)
      if (!item) return
      const shortcutName = `${item.name} - Shortcut`
      await createShortcut(shortcutName, targetFolderId || null, itemId, item.type)
      addToast({
        title: 'Shortcut created',
        description: `Created shortcut "${shortcutName}"`,
        type: 'success',
        duration: 3000,
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to create shortcut',
        type: 'error',
        duration: 4000,
      })
    }
    handleCloseDropdown()
  }, [isAuthenticated, allSearchItems, createShortcut, addToast, handleCloseDropdown])

  // Move items — the MoveFolderDialog handles the actual move operation.
  // This callback is passed to ActionDropdown but only used as a fallback.
  const handleMoveItems = useCallback(async (_itemIds: string[], _targetFolderId: string) => {
    // No-op: moves are handled by MoveFolderDialog opened via useDialogs()
  }, [])

  // Share success — no cache update needed in search (results are read-only snapshots)
  const handleShareSuccess = useCallback(() => {
    // No-op for now: search results don't need immediate cache updates
  }, [])

  // Update URL when tab changes
  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.replace(`/search?${params.toString()}`)
  }, [router, searchParams])

  // Add to history when query changes
  React.useEffect(() => {
    if (query.trim()) {
      addToHistory(query)
    }
  }, [query, addToHistory])

  // Derive the active tab from URL (signed-in users only)
  const activeTab = useMemo<SignedInTab>(() => {
    const validTabs: SignedInTab[] = ['my-networks', 'public', 'private']
    if (validTabs.includes(urlTab as SignedInTab)) return urlTab as SignedInTab
    if (urlTab === 'networks') return 'public'
    return 'my-networks'
  }, [urlTab])

  // Sync URL tab param when the derived tab differs (e.g., after sign-out
  // invalidates an auth-only tab like 'my-networks' or 'private')
  React.useEffect(() => {
    if (!isAuthenticated) {
      // Anonymous users don't use tabs — remove stale tab param from URL
      if (urlTab) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('tab')
        router.replace(`/search?${params.toString()}`)
      }
      return
    }
    if (urlTab && urlTab !== activeTab) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', activeTab)
      router.replace(`/search?${params.toString()}`)
    }
  }, [isAuthenticated, activeTab, urlTab, searchParams, router])

  // Find the item for the open dropdown
  const dropdownItem = useMemo(() => {
    if (!openDropdownId) return null
    return allSearchItems.find(item => item.uuid === openDropdownId) || null
  }, [openDropdownId, allSearchItems])

  // No query — show initial state
  if (!query.trim()) {
    return (
          <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        <SearchEmptyState type="initial" />
      </div>
    )
  }

  // Determine if the "My Networks" partial failure uses ~ prefix
  const myNetworksCountPrefix = myNetworks.hasAnyError && !(myNetworks.publicError && myNetworks.privateError) ? '~' : ''

  return (
    <div className="container mx-auto px-4 py-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <div className="text-sm text-muted-foreground">
          Search &gt; &ldquo;{query}&rdquo;
        </div>
        {/* Relevance badge for fixed-sort tabs (Public, Private, or anonymous results) */}
        {(!isAuthenticated || activeTab === 'public' || activeTab === 'private') && (
          <RelevanceBadge />
        )}
      </div>

      {isAuthenticated ? (
        /* Signed-in: three tabs */
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="my-networks">
              My Networks
              {myNetworksCountPrefix ? (
                <span className="text-muted-foreground ml-1">({myNetworksCountPrefix}{myNetworks.numFound.toLocaleString()})</span>
              ) : (
                <TabCount count={myNetworks.numFound} isTruncated={myNetworks.isTruncated} hasError={!!(myNetworks.publicError && myNetworks.privateError)} />
              )}
            </TabsTrigger>
            <TabsTrigger value="public">
              Public
              <TabCount count={publicResults.numFound} hasError={!!publicResults.error} />
            </TabsTrigger>
            <TabsTrigger value="private">
              Private &amp; Unlisted
              <TabCount count={privateResults.numFound} hasError={!!privateResults.error} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-networks" className="flex-1 overflow-y-auto min-h-0">
            <MyNetworksTabContent data={myNetworks} query={query} onDropdownToggle={handleDropdownToggle} />
          </TabsContent>

          <TabsContent value="public" className="flex-1 overflow-y-auto min-h-0">
            <FileTabContent
              items={publicResults.items}
              isLoading={publicResults.isLoading}
              error={publicResults.error}
              sortable={false}
              showVisibilityColumn={false}
              hasMore={publicResults.hasMore}
              loadMore={publicResults.loadMore}
              query={query}
              onDropdownToggle={handleDropdownToggle}
            />
          </TabsContent>

          <TabsContent value="private" className="flex-1 overflow-y-auto min-h-0">
            <FileTabContent
              items={privateResults.items}
              isLoading={privateResults.isLoading}
              error={privateResults.error}
              sortable={false}
              hasMore={privateResults.hasMore}
              loadMore={privateResults.loadMore}
              query={query}
              onDropdownToggle={handleDropdownToggle}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* Anonymous: no tabs, just a results header */
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium shrink-0">
            Results
            <TabCount count={publicResults.numFound} hasError={!!publicResults.error} />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <FileTabContent
              items={publicResults.items}
              isLoading={publicResults.isLoading}
              error={publicResults.error}
              sortable={false}
              showVisibilityColumn={false}
              hasMore={publicResults.hasMore}
              loadMore={publicResults.loadMore}
              query={query}
              onDropdownToggle={handleDropdownToggle}
            />
          </div>
        </div>
      )}

      {/* Action dropdown menu */}
      {openDropdownId && (
        <ActionDropdown
          openDropdownId={openDropdownId}
          dropdownType={dropdownType}
          item={dropdownItem}
          tabState={MyAccountTabType.SEARCH}
          currentFolderId={null}
          onClose={handleCloseDropdown}
          onDelete={handleDeleteItems}
          onRestore={handleRestore}
          onCreateShortcut={handleCreateShortcut}
          onMoveItems={handleMoveItems}
          onShareSuccess={handleShareSuccess}
        />
      )}
    </div>
  )
}

// --- Exported wrapper with DialogProvider ---
export function SearchResultsPage() {
  return (
    <DialogProvider>
      <SearchResultsPageContent />
    </DialogProvider>
  )
}