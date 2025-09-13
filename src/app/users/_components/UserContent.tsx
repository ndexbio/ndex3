'use client'

import React, { useState } from 'react'
import { Grid, List, Folder, Info } from 'lucide-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import FoldersList from '@/components/shared/FoldersList'
import NetworksList from '@/components/shared/NetworksList'
import DetailsPanel from '@/components/shared/DetailsPanel'

interface UserContentProps {
  content: FileItemBase[]
  isLoading: boolean
  userName?: string
}

export default function UserContent({ content, isLoading, userName }: UserContentProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Handle item selection (similar to my-account page)
  const handleSelect = (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: 'FOLDER' | 'NETWORK',
    sortedItems: FileItemBase[]
  ) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    const isShift = event.shiftKey

    if (isCtrlOrCmd) {
      // Toggle selection of this item
      setSelectedItems(prev => 
        prev.includes(id) 
          ? prev.filter(item => item !== id)
          : [...prev, id]
      )
    } else if (isShift && selectedItems.length > 0) {
      // Select range from last selected to current
      const lastSelectedId = selectedItems[selectedItems.length - 1]
      const lastIndex = sortedItems.findIndex(item => item.uuid === lastSelectedId)
      const currentIndex = index
      
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = sortedItems.slice(start, end + 1).map(item => item.uuid)
        setSelectedItems(prev => [...new Set([...prev, ...rangeIds])])
      }
    } else {
      // Single selection
      setSelectedItems([id])
    }
  }

  // Filter content by type (same as my-account page)
  const folders = content.filter(
    (item) =>
      item.type === NDExFileType.FOLDER ||
      (item.type === NDExFileType.SHORTCUT &&
        item.attributes?.target_type === NDExFileType.FOLDER)
  )

  const networks = content.filter(
    (item) =>
      item.type === NDExFileType.NETWORK ||
      (item.type === NDExFileType.SHORTCUT &&
        item.attributes?.target_type === NDExFileType.NETWORK)
  )

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-card border border-border rounded-md">
        <header className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-border">
          <h2 className="text-xl font-semibold">Public Content</h2>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-full overflow-hidden border border-border">
              <button className="flex items-center justify-center p-2 w-10 bg-accent text-accent-foreground">
                <List className="h-5 w-5" />
              </button>
              <button className="flex items-center justify-center p-2 w-10 bg-background text-muted-foreground">
                <Grid className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted animate-pulse rounded-md">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
                <div className="flex-1">
                  <div className="w-48 h-4 bg-muted-foreground/20 rounded mb-2" />
                  <div className="w-32 h-3 bg-muted-foreground/20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render empty state
  if (!content || content.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-card border border-border rounded-md">
        <header className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-border">
          <h2 className="text-xl font-semibold">Public Content</h2>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Folder className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No public content</h3>
            <p className="text-muted-foreground">
              {userName ? `${userName} hasn&apos;t shared any public content yet.` : 'This user hasn&apos;t shared any public content yet.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-card border border-border rounded-md">
      {/* Header - matching my-account page style */}
      <header className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold">Public Content</h2>
          <p className="text-sm text-muted-foreground">
            {content.length} item{content.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle - same as my-account */}
          <div className="flex rounded-full overflow-hidden border border-border">
            <button
              className={`flex items-center justify-center p-2 w-10 transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              className={`flex items-center justify-center p-2 w-10 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
          </div>
          
          {/* Info Panel Toggle */}
          <button
            className={`p-3 rounded-full transition-colors ${
              detailsOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => setDetailsOpen(!detailsOpen)}
            aria-label="Toggle details panel"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content - flex container with details panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <DndProvider backend={HTML5Backend}>
            {/* Folders Section - only show if there are folders */}
            {folders.length > 0 && (
              <FoldersList
                folders={folders}
                viewMode={viewMode}
                readOnly={true}
                selectedItems={selectedItems}
                onSelect={handleSelect}
                onDropdownToggle={(_, id, type) => {
                  // Handle dropdown toggle for public read-only mode
                  console.log('Public user folder dropdown:', { id, type })
                }}
              />
            )}

            {/* Networks Section */}
            <NetworksList
              items={networks}
              viewMode={viewMode}
              readOnly={true}
              showVisibilityColumn={false}
              selectedItems={selectedItems}
              onSelect={handleSelect}
              onDropdownToggle={(_, id, type) => {
                // Handle dropdown toggle for public read-only mode
                // This could show a different menu with options like "View in NDEx", "Copy Link", etc.
                console.log('Public user dropdown:', { id, type })
              }}
            />
          </DndProvider>
        </div>

        {/* Details Panel */}
        {detailsOpen && (
          <DetailsPanel
            isOpen={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            selectedItems={selectedItems}
            allItems={[...folders, ...networks]}
          />
        )}
      </div>
    </div>
  )
}