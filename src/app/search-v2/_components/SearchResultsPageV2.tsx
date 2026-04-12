'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { SearchEmptyState } from '../../search/_components/SearchEmptyState'
import Link from 'next/link'
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

// --- Filter chip component ---
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
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
        }
      `}
    >
      {label}
      {count !== undefined && (
        <span
          className={`
            tabular-nums
            ${active ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}
          `}
        >
          {count.toLocaleString()}
        </span>
      )}
    </button>
  )
}

// --- Type filter dropdown chip ---
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
              ? 'bg-primary text-primary-foreground border-primary'
              : noneActive
              ? 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              : 'bg-primary/80 text-primary-foreground border-primary/80'
          }
        `}
      >
        Type
        {!allActive && !noneActive && (
          <span className="text-primary-foreground/70">{activeCount}/3</span>
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
                  ${opt.active ? 'bg-primary border-primary' : 'border-muted-foreground/40'}
                `}
              >
                {opt.active && (
                  <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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

// --- Main SearchResultsPage (inner content, must be inside DialogProvider) ---
function SearchResultsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const config = useConfig()
  const query = searchParams.get('q') || ''
  const { isAuthenticated, token, user } = useAuth()
  const { addToHistory } = useSearchStore()
  const { addToast } = useToast()

  // --- Filter state ---
  const [showMine, setShowMine] = useState(false)
  const [showPublic, setShowPublic] = useState(true)
  const [showPrivate, setShowPrivate] = useState(true)
  const [showUnlisted, setShowUnlisted] = useState(true)
  const [showNetworks, setShowNetworks] = useState(true)
  const [showFolders, setShowFolders] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const [hasColumnSort, setHasColumnSort] = useState(false)

  // --- Dropdown state ---
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [dropdownType, setDropdownType] = useState<NDExFileType | null>(null)

  // --- Hooks ---
  const { createShortcut } = useShortcut(null)
  const { publicResults, privateResults } = useFileSearch(query)

  // Current user's username for "My Networks" filter
  const currentUserName = user?.userName || null

  // --- Merge and deduplicate results ---
  // Order: user's own items first, then other private/unlisted, then public.
  // Dedupe by UUID since a user's own public networks appear in both result sets.
  // Normalize visibility so items without it get the correct default.
  const mergedItems = useMemo(() => {
    const seen = new Set<string>()
    const owned: FileItemBase[] = []
    const otherPrivate: FileItemBase[] = []
    const pub: FileItemBase[] = []

    // Private/unlisted results — default missing visibility to 'PRIVATE'
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

    // Public results — default missing visibility to 'PUBLIC'
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

    // Sort owned items: private/unlisted before public
    owned.sort((a, b) => {
      const aPublic = a.visibility === 'PUBLIC' ? 1 : 0
      const bPublic = b.visibility === 'PUBLIC' ? 1 : 0
      return aPublic - bPublic
    })

    return [...owned, ...otherPrivate, ...pub]
  }, [publicResults.items, privateResults.items, currentUserName])

  // --- Compute counts per filter ---
  // Counts reflect the "Only Mine" constraint so they update when toggled
  const filterCounts = useMemo(() => {
    const baseItems = showMine && currentUserName
      ? mergedItems.filter((item) => item.owner === currentUserName)
      : mergedItems

    let mine = 0
    let pub = 0
    let priv = 0
    let unlisted = 0
    let networkCount = 0
    let folderCount = 0
    let shortcutCount = 0

    for (const item of mergedItems) {
      if (currentUserName && item.owner === currentUserName) mine++
    }

    for (const item of baseItems) {
      if (item.visibility === 'PUBLIC') pub++
      else if (item.visibility === 'PRIVATE') priv++
      else if (item.visibility === 'UNLISTED') unlisted++

      if (item.type === NDExFileType.NETWORK) networkCount++
      else if (item.type === NDExFileType.FOLDER) folderCount++
      else if (item.type === NDExFileType.SHORTCUT) shortcutCount++
    }

    return {
      mine,
      public: pub,
      private: priv,
      unlisted,
      networks: networkCount,
      folders: folderCount,
      shortcuts: shortcutCount,
    }
  }, [mergedItems, currentUserName, showMine])

  // --- Apply filters ---
  const filteredItems = useMemo(() => {
    return mergedItems.filter((item) => {
      const isMine = currentUserName && item.owner === currentUserName

      // "Only My Networks" — when ON, exclude everything not owned by me
      if (showMine && !isMine) return false

      // Visibility filters apply to whatever remains
      const vis = item.visibility || 'PRIVATE'
      if (vis === 'PUBLIC' && !showPublic) return false
      if (vis === 'PRIVATE' && !showPrivate) return false
      if (vis === 'UNLISTED' && !showUnlisted) return false

      // Type filters
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
    showUnlisted,
    showNetworks,
    showFolders,
    showShortcuts,
    currentUserName,
  ])

  // Split into folders and networks for display
  const { folders, networks } = useMemo(() => splitByType(filteredItems), [filteredItems])

  // --- Loading / error state ---
  const isLoading = publicResults.isLoading || privateResults.isLoading
  const hasError = !!(publicResults.error || privateResults.error)
  const bothFailed = !!(publicResults.error && privateResults.error)

  // --- "Load more" for public results (private is single-fetch) ---
  const hasMore = publicResults.hasMore
  const loadMore = publicResults.loadMore

  // All search items for action callbacks
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
    [config.ndexBaseUrl, token, allSearchItems, addToast, handleCloseDropdown],
  )

  const handleRestore = useCallback(async () => {}, [])

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
    [isAuthenticated, allSearchItems, createShortcut, addToast, handleCloseDropdown],
  )

  const handleSortChange = useCallback((field: string | null) => {
    setHasColumnSort(field !== null)
  }, [])
  const handleMoveItems = useCallback(async (_itemIds: string[], _targetFolderId: string) => {}, [])
  const handleShareSuccess = useCallback(() => {}, [])

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
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Return to original view
                  </Link>
                </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
        {isAuthenticated && currentUserName && (
          <FilterChip
            label="Only Mine"
            active={showMine}
            count={filterCounts.mine}
            onClick={() => setShowMine(!showMine)}
          />
        )}
        <FilterChip
          label="Public"
          active={showPublic}
          count={filterCounts.public}
          onClick={() => setShowPublic(!showPublic)}
        />
        {isAuthenticated && (
          <>
            <FilterChip
              label="Private"
              active={showPrivate}
              count={filterCounts.private}
              onClick={() => setShowPrivate(!showPrivate)}
            />
            <FilterChip
              label="Unlisted"
              active={showUnlisted}
              count={filterCounts.unlisted}
              onClick={() => setShowUnlisted(!showUnlisted)}
            />
          </>
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
        {(showMine || !showPublic || !showPrivate || !showUnlisted ||
          !showNetworks || !showFolders || !showShortcuts || hasColumnSort) && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            onClick={() => {
              setShowMine(false)
              setShowPublic(true)
              setShowPrivate(true)
              setShowUnlisted(true)
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
        <InlineError message="Unable to load results." />
      )}
      {hasError && !bothFailed && (
        <InlineError message="Some results may be missing." />
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
                  setShowMine(true)
                  setShowPublic(true)
                  setShowPrivate(true)
                  setShowUnlisted(true)
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
          </DndProvider>
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
        />
      )}
    </div>
  )
}

// --- Exported wrapper with DialogProvider ---
export function SearchResultsPageV2() {
  return (
    <DialogProvider>
      <SearchResultsPageContent />
    </DialogProvider>
  )
}