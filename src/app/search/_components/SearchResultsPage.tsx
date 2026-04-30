'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useSearchStore } from '@/stores/search-store'
import { useFileSearch } from '@/hooks/use-file-search'
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

// --- Helper: split items into folders and networks ---
function splitByType(items: FileItemBase[]) {
  const folders: FileItemBase[] = []
  const networks: FileItemBase[] = []
  for (const item of items) {
    if (
      item.type === NDExFileType.FOLDER ||
      (item.type === NDExFileType.SHORTCUT &&
        item.attributes?.target_type === NDExFileType.FOLDER)
    ) {
      folders.push(item)
    } else {
      networks.push(item)
    }
  }
  return { folders, networks }
}

// --- Inline error component ---
function InlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
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

// --- Filter chip component (blue when active) ---
function FilterChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        border transition-colors duration-150 select-none
        ${
          active
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
        }
      `}
    >
      {label}
      {count !== undefined && (
        <span
          className={`
            tabular-nums
            ${active ? 'text-white/70' : 'text-muted-foreground/70'}
          `}
        >
          {count.toLocaleString()}
        </span>
      )}
    </button>
  )
}

// --- Type filter dropdown chip (blue when active) ---
function TypeFilterChip({
  showNetworks,
  showFolders,
  showShortcuts,
  counts,
  onToggleNetworks,
  onToggleFolders,
  onToggleShortcuts,
}: {
  showNetworks: boolean
  showFolders: boolean
  showShortcuts: boolean
  counts: { networks: number; folders: number; shortcuts: number }
  onToggleNetworks: () => void
  onToggleFolders: () => void
  onToggleShortcuts: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const allActive = showNetworks && showFolders && showShortcuts
  const noneActive = !showNetworks && !showFolders && !showShortcuts
  const activeCount = [showNetworks, showFolders, showShortcuts].filter(Boolean).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const options = [
    { label: 'Networks', active: showNetworks, count: counts.networks, onToggle: onToggleNetworks },
    { label: 'Folders', active: showFolders, count: counts.folders, onToggle: onToggleFolders },
    { label: 'Shortcuts', active: showShortcuts, count: counts.shortcuts, onToggle: onToggleShortcuts },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          border transition-colors duration-150 select-none
          ${
            allActive
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : noneActive
              ? 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
          }
        `}
      >
        File Type
        {!allActive && !noneActive && (
          <span className="text-white/70">{activeCount}/3</span>
        )}
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[180px]">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={opt.onToggle}
            >
              <div
                className={`
                  h-4 w-4 rounded border flex items-center justify-center shrink-0
                  ${opt.active ? 'bg-blue-600 border-blue-600' : 'border-muted-foreground/40'}
                `}
              >
                {opt.active && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-left">{opt.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {opt.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Helper: sync filter state to URL without triggering Next.js navigation ---
function syncFiltersToUrl(
  query: string,
  showMine: boolean,
  showPublic: boolean,
  showPrivate: boolean,
  showNetworks: boolean,
  showFolders: boolean,
  showShortcuts: boolean,
) {
  const parts: string[] = []
  if (query) parts.push(`q=${encodeURIComponent(query)}`)
  if (showMine) parts.push('mine=1')

  const allVisOn = showPublic && showPrivate
  if (!allVisOn) {
    const vis: string[] = []
    if (showPublic) vis.push('public')
    if (showPrivate) vis.push('private')
    if (vis.length > 0) parts.push(`vis=${vis.join(',')}`)
  }

  const allTypeOn = showNetworks && showFolders && showShortcuts
  if (!allTypeOn) {
    const type: string[] = []
    if (showNetworks) type.push('networks')
    if (showFolders) type.push('folders')
    if (showShortcuts) type.push('shortcuts')
    if (type.length > 0) parts.push(`type=${type.join(',')}`)
  }

  window.history.replaceState(null, '', `${window.location.pathname}?${parts.join('&')}`)
}

// --- Main SearchResultsPage (inner content, must be inside DialogProvider) ---
function SearchResultsPageContent() {
  const searchParams = useSearchParams()
  const config = useConfig()
  const query = searchParams.get('q') || ''
  const { isAuthenticated, token, user } = useAuth()
  const { addToHistory } = useSearchStore()
  const { addToast } = useToast()

  // --- Parse filter state from URL params (only on initial mount) ---
  const urlVis = searchParams.get('vis')
  const urlType = searchParams.get('type')
  const urlMine = searchParams.get('mine')

  const [showMine, setShowMine] = useState(() => urlMine === '1')
  const [showPublic, setShowPublic] = useState(() =>
    urlVis !== null ? urlVis.split(',').includes('public') : true
  )
  const [showPrivate, setShowPrivate] = useState(() =>
    urlVis !== null ? urlVis.split(',').includes('private') : true
  )
  const [showNetworks, setShowNetworks] = useState(() =>
    urlType !== null ? urlType.split(',').includes('networks') : true
  )
  const [showFolders, setShowFolders] = useState(() =>
    urlType !== null ? urlType.split(',').includes('folders') : true
  )
  const [showShortcuts, setShowShortcuts] = useState(() =>
    urlType !== null ? urlType.split(',').includes('shortcuts') : true
  )
  const [resetKey, setResetKey] = useState(0)
  const [hasColumnSort, setHasColumnSort] = useState(false)

  // --- Sync filter state to URL on changes (skip initial render) ---
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    syncFiltersToUrl(query, showMine, showPublic, showPrivate, showNetworks, showFolders, showShortcuts)
  }, [query, showMine, showPublic, showPrivate, showNetworks, showFolders, showShortcuts])

  // --- Dropdown state ---
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [dropdownType, setDropdownType] = useState<NDExFileType | null>(null)

  // --- Hooks ---
  const { createShortcut } = useShortcut(null)
  const { publicResults, privateResults, refetch } = useFileSearch(query)

  // Current user's username for "My Networks" filter
  const currentUserName = user?.userName || null

  // --- Merge and deduplicate results ---
  const mergedItems = useMemo(() => {
    const seen = new Set<string>()
    const owned: FileItemBase[] = []
    const otherPrivate: FileItemBase[] = []
    const pub: FileItemBase[] = []

    for (const item of privateResults.items) {
      if (seen.has(item.uuid)) continue
      seen.add(item.uuid)
      const normalized = item.visibility ? item : { ...item, visibility: 'PRIVATE' }
      if (currentUserName && normalized.owner === currentUserName) {
        owned.push(normalized)
      } else {
        otherPrivate.push(normalized)
      }
    }

    for (const item of publicResults.items) {
      if (seen.has(item.uuid)) continue
      seen.add(item.uuid)
      const normalized = item.visibility ? item : { ...item, visibility: 'PUBLIC' }
      if (currentUserName && normalized.owner === currentUserName) {
        owned.push(normalized)
      } else {
        pub.push(normalized)
      }
    }

    owned.sort((a, b) => {
      const aPublic = a.visibility === 'PUBLIC' ? 1 : 0
      const bPublic = b.visibility === 'PUBLIC' ? 1 : 0
      return aPublic - bPublic
    })

    return [...owned, ...otherPrivate, ...pub]
  }, [publicResults.items, privateResults.items, currentUserName])

  // --- Compute counts per filter ---
  // "Private" count includes PRIVATE + UNLISTED
  const filterCounts = useMemo(() => {
    const baseItems = showMine && currentUserName
      ? mergedItems.filter((item) => item.owner === currentUserName)
      : mergedItems

    let mine = 0
    let pub = 0
    let priv = 0
    let networkCount = 0
    let folderCount = 0
    let shortcutCount = 0

    for (const item of mergedItems) {
      if (currentUserName && item.owner === currentUserName) mine++
    }

    for (const item of baseItems) {
      const vis = item.visibility || 'PRIVATE'
      if (vis === 'PUBLIC') pub++
      else priv++ // PRIVATE and UNLISTED both count as private

      if (item.type === NDExFileType.NETWORK) networkCount++
      else if (item.type === NDExFileType.FOLDER) folderCount++
      else if (item.type === NDExFileType.SHORTCUT) shortcutCount++
    }

    return {
      mine,
      public: pub,
      private: priv,
      networks: networkCount,
      folders: folderCount,
      shortcuts: shortcutCount,
    }
  }, [mergedItems, currentUserName, showMine])

  // --- Apply filters ---
  const filteredItems = useMemo(() => {
    return mergedItems.filter((item) => {
      const isMine = currentUserName && item.owner === currentUserName

      if (showMine && !isMine) return false

      const vis = item.visibility || 'PRIVATE'
      if (vis === 'PUBLIC' && !showPublic) return false
      if ((vis === 'PRIVATE' || vis === 'UNLISTED') && !showPrivate) return false

      if (item.type === NDExFileType.NETWORK && !showNetworks) return false
      if (item.type === NDExFileType.FOLDER && !showFolders) return false
      if (item.type === NDExFileType.SHORTCUT && !showShortcuts) return false

      return true
    })
  }, [
    mergedItems,
    showMine,
    showPublic,
    showPrivate,
    showNetworks,
    showFolders,
    showShortcuts,
    currentUserName,
  ])

  const { folders, networks } = useMemo(() => splitByType(filteredItems), [filteredItems])

  const isLoading = publicResults.isLoading || privateResults.isLoading
  const hasError = !!(publicResults.error || privateResults.error)
  const bothFailed = !!(publicResults.error && privateResults.error)

  const hasMore = publicResults.hasMore
  const loadMore = publicResults.loadMore

  const allSearchItems = mergedItems

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

  const handleDropdownToggle = useCallback(
    (event: React.MouseEvent, id: string, type: NDExFileType) => {
      event.preventDefault()
      if (openDropdownId === id && dropdownType === type) {
        setOpenDropdownId(null)
        setDropdownType(null)
      } else {
        setOpenDropdownId(id)
        setDropdownType(type)
      }
    },
    [openDropdownId, dropdownType],
  )


  const handleCloseDropdown = useCallback(() => {
    setOpenDropdownId(null)
    setDropdownType(null)
  }, [])

  // --- Refetch search results without a full page reload.
  // SWR keeps existing data visible during revalidation, so the UI doesn't flash.
  // Wrapped to swallow errors so callers don't have to worry about rejections.
  const handleRefreshSearchResults = useCallback(async () => {
    try {
      await refetch()
    } catch (err) {
      // Revalidation errors surface through publicResults.error / privateResults.error,
      // which the inline error banner already handles. Nothing more to do here.
      console.error('Failed to refresh search results:', err)
    }
  }, [refetch])

  // --- Action callbacks ---
  const handleDeleteItems = useCallback(
    async (itemIds: string[]) => {
      try {
        const ndexClient = getNdexClient(config.ndexBaseUrl, token)
        for (const id of itemIds) {
          const item = allSearchItems.find((i) => i.uuid === id)
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
        // Refresh so deleted items disappear from the list
        await handleRefreshSearchResults()
      } catch (error) {
        addToast({
          title: 'Error',
          description: 'Failed to move item to trash',
          type: 'error',
          duration: 4000,
        })
      }
      handleCloseDropdown()
    },
    [config.ndexBaseUrl, token, allSearchItems, addToast, handleCloseDropdown, handleRefreshSearchResults],
  )

  // Restore is not reachable from search results (tabState is SEARCH, not TRASH),
  // but wired to refetch defensively in case that changes.
  const handleRestore = useCallback(async () => {
    await handleRefreshSearchResults()
  }, [handleRefreshSearchResults])

  const handleCreateShortcut = useCallback(
    async (itemId: string, targetFolderId?: string) => {
      if (!isAuthenticated) return
      try {
        const item = allSearchItems.find((i) => i.uuid === itemId)
        if (!item) return
        const shortcutName = `${item.name} - Shortcut`
        await createShortcut(shortcutName, targetFolderId || null, itemId, item.type)
        addToast({
          title: 'Shortcut created',
          description: `Created shortcut "${shortcutName}"`,
          type: 'success',
          duration: 3000,
        })
        // Refresh so the new shortcut shows up if it lands in this search
        await handleRefreshSearchResults()
      } catch (error) {
        addToast({
          title: 'Error',
          description: 'Failed to create shortcut',
          type: 'error',
          duration: 4000,
        })
      }
      handleCloseDropdown()
    },
    [isAuthenticated, allSearchItems, createShortcut, addToast, handleCloseDropdown, handleRefreshSearchResults],
  )

  const handleSortChange = useCallback((field: string | null) => {
    setHasColumnSort(field !== null)
  }, [])

  // Wire to refetch so moved items reflect their new state.
  const handleMoveItems = useCallback(
    async (_itemIds: string[], _targetFolderId: string) => {
      await handleRefreshSearchResults()
    },
    [handleRefreshSearchResults],
  )

  // Wire to refetch so visibility changes (PUBLIC <-> PRIVATE)
  // reflect immediately. The updatedItems argument from ShareDialog is ignored here
  // since refetch will pull authoritative state from the server.
  const handleShareSuccess = useCallback(() => {
    void handleRefreshSearchResults()
  }, [handleRefreshSearchResults])

    const handleRemoveShortcut = useCallback(
      async (shortcutId: string) => {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          await ndexClient.files.deleteShortcut(shortcutId)
          addToast({
            title: 'Shortcut removed',
            description: 'The shortcut has been removed',
            type: 'success',
            duration: 3000,
          })
          await handleRefreshSearchResults()
        } catch (error) {
          addToast({
            title: 'Error',
            description: 'Failed to remove shortcut',
            type: 'error',
            duration: 4000,
          })
        }
      },
      [config.ndexBaseUrl, token, addToast, handleRefreshSearchResults],
    )

  // Add to history when query changes
  useEffect(() => {
    if (query.trim()) {
      addToHistory(query)
    }
  }, [query, addToHistory])

  // Find the item for the open dropdown
  const dropdownItem = useMemo(() => {
    if (!openDropdownId) return null
    return allSearchItems.find((item) => item.uuid === openDropdownId) || null
  }, [openDropdownId, allSearchItems])

  // No query — show initial state
  if (!query.trim()) {
    return (
      <div className="container mx-auto px-4 py-8 h-full overflow-y-auto">
        <SearchEmptyState type="initial" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <div className="text-sm text-muted-foreground">
          Search &gt; &ldquo;{query}&rdquo;
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filteredItems.length.toLocaleString()} of{' '}
            {mergedItems.length.toLocaleString()} results
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
        {/* Only Mine checkbox */}
        {isAuthenticated && currentUserName && (
          <label
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
            title="When checked, only show networks you own. When unchecked, show all networks."
          >
            <input
              type="checkbox"
              checked={showMine}
              onChange={() => setShowMine(!showMine)}
              className="h-3.5 w-3.5 rounded border-border accent-blue-600"
            />
            Only mine
          </label>
        )}
        <FilterChip
          label="Public"
          active={showPublic}
          count={filterCounts.public}
          onClick={() => setShowPublic(!showPublic)}
        />
        {isAuthenticated && (
          <FilterChip
            label="Private"
            active={showPrivate}
            count={filterCounts.private}
            onClick={() => setShowPrivate(!showPrivate)}
          />
        )}
        <TypeFilterChip
          showNetworks={showNetworks}
          showFolders={showFolders}
          showShortcuts={showShortcuts}
          counts={{
            networks: filterCounts.networks,
            folders: filterCounts.folders,
            shortcuts: filterCounts.shortcuts,
          }}
          onToggleNetworks={() => setShowNetworks(!showNetworks)}
          onToggleFolders={() => setShowFolders(!showFolders)}
          onToggleShortcuts={() => setShowShortcuts(!showShortcuts)}
        />

        {/* Reset filters — only show when something differs from defaults */}
        {(showMine || !showPublic || !showPrivate ||
          !showNetworks || !showFolders || !showShortcuts || hasColumnSort) && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            onClick={() => {
              setShowMine(false)
              setShowPublic(true)
              setShowPrivate(true)
              setShowNetworks(true)
              setShowFolders(true)
              setShowShortcuts(true)
              setHasColumnSort(false)
              setResetKey((k) => k + 1)
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Error states */}
      {bothFailed && filteredItems.length === 0 && (
        <InlineError message="Unable to load results." onRetry={handleRefreshSearchResults} />
      )}
      {hasError && !bothFailed && (
        <InlineError message="Some results may be missing." onRetry={handleRefreshSearchResults} />
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!isLoading && filteredItems.length === 0 && !hasError ? (
          mergedItems.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No results match your filters.</p>
              <button
                type="button"
                className="text-sm text-primary hover:underline mt-2"
                onClick={() => {
                  setShowMine(false)
                  setShowPublic(true)
                  setShowPrivate(true)
                  setShowNetworks(true)
                  setShowFolders(true)
                  setShowShortcuts(true)
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <SearchEmptyState type="no-results" query={query} />
          )
        ) : (
            <>
                        {(() => {
                          console.log('search debug:', {
                            currentUserName,
                            sampleItem: filteredItems[0],
                            sampleOwner: filteredItems[0]?.owner,
                            unavailableShortcuts: filteredItems.filter(
                              (i) => i.type === NDExFileType.SHORTCUT &&
                                     (i.attributes?.target_status === 'IN_TRASH' || i.attributes?.target_status === 'DELETED')
                            ),
                          })
                          return null
                        })()}
          <DndProvider backend={HTML5Backend}>
            {folders.length > 0 && (
              <FoldersList
                key={`folders-${resetKey}`}
                folders={folders}
                viewMode="list"
                readOnly={true}
                showOwnerColumn={true}
                showVisibilityColumn={true}
                sortable={true}
                defaultSort={{ field: null, direction: null }}
                onSortChange={handleSortChange}
                onDropdownToggle={handleDropdownToggle}
                onRemoveShortcut={handleRemoveShortcut}
              />
            )}
            <NetworksList
              key={`networks-${resetKey}`}
              items={networks}
              viewMode="list"
              readOnly={true}
              showOwnerColumn={true}
              showVisibilityColumn={true}
              sortable={true}
              defaultSort={{ field: null, direction: null }}
              onSortChange={handleSortChange}
              onDropdownToggle={handleDropdownToggle}
              onRemoveShortcut={handleRemoveShortcut}
            />
            {isLoading && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Loading...
              </div>
            )}
            {hasMore && !isLoading && (
              <div className="text-center py-4">
                <Button variant="outline" size="sm" onClick={loadMore}>
                  Load more results
                </Button>
              </div>
            )}
          </DndProvider> </>
        )}
      </div>

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
          onRefreshFolder={handleRefreshSearchResults}
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