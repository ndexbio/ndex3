import React, { useState, useEffect, useMemo } from 'react'
import { X, Folder, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useFolderContents } from '@/hooks/use-folder'
import { useSharedFiles } from '@/hooks/use-shared-files'
import { useFileMoveOperation } from '@/hooks/use-file-move-operation'

interface MoveFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  itemsToMove: string[]
  itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>
  currentFolderId: string | null
  currentFolderName?: string
  onMoveComplete: () => Promise<void>
}

type ViewMode = 'all' | 'myDrive' | 'shared'

interface NavigationItem {
  id: string
  name: string
}

const MoveFolderDialog: React.FC<MoveFolderDialogProps> = ({
  isOpen,
  onClose,
  itemsToMove,
  itemDataMap,
  currentFolderId,
  currentFolderName,
  onMoveComplete
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null)
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)

  // Data fetching - always call hooks but conditionally use results
  const myDriveFoldersResult = useFolderContents(
    viewMode === 'myDrive' ? browseFolderId : null
  )
  const sharedFilesResult = useSharedFiles()

  const myDriveFolders = viewMode === 'myDrive' ? myDriveFoldersResult.items : []
  const sharedItems = viewMode === 'shared' ? sharedFilesResult.items : []

  // Get display items for the move hook
  // Include items being moved so they're available for the move operation
  const displayItems = useMemo(() => {
    const items = [...myDriveFolders, ...sharedItems]

    // Add items being moved if not already in the list
    itemsToMove.forEach(itemId => {
      if (!items.find(item => item.uuid === itemId) && itemDataMap[itemId]) {
        const itemData = itemDataMap[itemId]
        items.push({
          uuid: itemId,
          name: itemData.name,
          type: itemData.type,
          attributes: { visibility: itemData.visibility }
        } as any)
      }
    })

    return items
  }, [myDriveFolders, sharedItems, itemsToMove, itemDataMap])

  // Move operation using the shared hook
  const { moveFiles, isMoving } = useFileMoveOperation(
    currentFolderId,
    displayItems,
    async () => {
      await onMoveComplete()
      onClose()
    }
  )

  // Computed values
  const dialogTitle = useMemo(() => {
    if (itemsToMove.length === 1) {
      const item = itemDataMap[itemsToMove[0]]
      return `Move "${item?.name || 'item'}"`
    }
    return `Move ${itemsToMove.length} items`
  }, [itemsToMove, itemDataMap])

  // Current location shows where the file currently is (source location)
  const currentLocationName = useMemo(() => {
    // This shows where the item is currently located (not where we're navigating)
    if (currentFolderId === null) {
      return 'My Drive'
    }
    // Use the provided folder name, or fall back to a placeholder
    return currentFolderName || 'Current Folder'
  }, [currentFolderId, currentFolderName])

  const currentNavigationFolderName = useMemo(() => {
    if (navigationStack.length > 0) {
      return navigationStack[navigationStack.length - 1].name
    }
    return ''
  }, [navigationStack])

  const displayFolders = useMemo(() => {
    if (viewMode === 'all') {
      return [] // Show location items, not folders
    } else if (viewMode === 'shared' && !browseFolderId) {
      // Show only folders from shared items
      return sharedItems.filter(item =>
        item.type === NDExFileType.FOLDER ||
        (item.type === NDExFileType.SHORTCUT && item.attributes?.target_type === NDExFileType.FOLDER)
      )
    } else {
      // Show folders from current folder
      return myDriveFolders.filter(item =>
        item.type === NDExFileType.FOLDER ||
        (item.type === NDExFileType.SHORTCUT && item.attributes?.target_type === NDExFileType.FOLDER)
      )
    }
  }, [viewMode, browseFolderId, myDriveFolders, sharedItems])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setViewMode('all')
      setBrowseFolderId(null)
      setNavigationStack([])
      setSelectedTargetId(null)
      setHoveredFolderId(null)
    }
  }, [isOpen])

  // Handlers
  const handleLocationSingleClick = (location: 'myDrive' | 'shared') => {
    if (isValidTarget(location)) {
      setSelectedTargetId(location)
    }
  }

  const handleLocationDoubleClick = (location: 'myDrive' | 'shared') => {
    setViewMode(location)
    setBrowseFolderId(null)
    setNavigationStack([{
      id: location,
      name: location === 'myDrive' ? 'My Drive' : 'Shared with me'
    }])
    setSelectedTargetId(null)
  }

  const handleFolderSingleClick = (folderId: string) => {
    if (isValidTarget(folderId)) {
      setSelectedTargetId(folderId)
    }
  }

  const handleFolderDoubleClick = (folderId: string, folderName: string) => {
    // Navigate into folder
    if (!itemsToMove.includes(folderId)) {
      setBrowseFolderId(folderId)
      setNavigationStack([...navigationStack, { id: folderId, name: folderName }])
      setSelectedTargetId(folderId) // Also set as target
    }
  }

  const handleBackClick = () => {
    if (navigationStack.length > 1) {
      const newStack = navigationStack.slice(0, -1)
      const parent = newStack[newStack.length - 1]

      setNavigationStack(newStack)
      setBrowseFolderId(parent.id === 'myDrive' || parent.id === 'shared' ? null : parent.id)
      setSelectedTargetId(null)
    } else {
      // Back to all locations
      setViewMode('all')
      setBrowseFolderId(null)
      setNavigationStack([])
      setSelectedTargetId(null)
    }
  }

  const handleQuickMove = async (targetId: string) => {
    if (isValidTarget(targetId)) {
      try {
        // Convert 'myDrive' to null for home folder
        const actualTargetId = targetId === 'myDrive' ? null : targetId
        const result = await moveFiles(itemsToMove, actualTargetId)
        console.log('[Move Dialog] Quick move result:', result)

        if (!result.success) {
          console.error('[Move Dialog] Move failed:', result.errors)
          alert(`Move failed: ${result.errors.join(', ')}`)
        }
      } catch (err) {
        console.error('[Move Dialog] Quick move error:', err)
        alert(`Move error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const handleMove = async () => {
    if (selectedTargetId && isValidTarget(selectedTargetId)) {
      try {
        // Convert 'myDrive' to null for home folder
        const actualTargetId = selectedTargetId === 'myDrive' ? null : selectedTargetId
        const result = await moveFiles(itemsToMove, actualTargetId)
        console.log('[Move Dialog] Move result:', result)

        if (!result.success) {
          console.error('[Move Dialog] Move failed:', result.errors)
          alert(`Move failed: ${result.errors.join(', ')}`)
        }
      } catch (err) {
        console.error('[Move Dialog] Move error:', err)
        alert(`Move error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const isValidTarget = (targetId: string | null): boolean => {
    if (!targetId) return false
    if (targetId === 'shared') return false // Can't move to "Shared with me" root
    // Allow 'myDrive' only if not already in home folder
    if (targetId === 'myDrive') return currentFolderId !== null
    if (targetId === currentFolderId) return false
    if (itemsToMove.includes(targetId)) return false
    // TODO: Check circular reference (folder into descendant)
    return true
  }

  const canNavigateInto = (locationId: 'myDrive' | 'shared'): boolean => {
    // Both My Drive and Shared with me can be navigated into
    return true
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[600px] max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{dialogTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Location - Always displayed */}
        <div className="px-6 py-2 text-sm text-gray-500 dark:text-gray-400">
          Current location: {currentLocationName}
        </div>

        {/* Reserved Navigation Row */}
        {navigationStack.length > 0 && viewMode !== 'all' && (
          <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentNavigationFolderName}
            </button>
          </div>
        )}

        {navigationStack.length === 0 && viewMode !== 'all' && (
          <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6"></div>
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700" />

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
          {viewMode === 'all' ? (
            <>
              {/* Location Items */}
              <LocationItem
                icon={<Folder className="h-5 w-5" />}
                name="My Drive"
                isSelected={selectedTargetId === 'myDrive'}
                canSelect={isValidTarget('myDrive')}
                canNavigate={canNavigateInto('myDrive')}
                canQuickMove={isValidTarget('myDrive')}
                onClick={() => handleLocationSingleClick('myDrive')}
                onDoubleClick={() => handleLocationDoubleClick('myDrive')}
                onNavigate={() => handleLocationDoubleClick('myDrive')}
                onQuickMove={() => handleQuickMove('myDrive')}
              />
              <LocationItem
                icon={<Users className="h-5 w-5" />}
                name="Shared with me"
                isSelected={selectedTargetId === 'shared'}
                canSelect={false}
                canNavigate={canNavigateInto('shared')}
                canQuickMove={false}
                onClick={() => handleLocationSingleClick('shared')}
                onDoubleClick={() => handleLocationDoubleClick('shared')}
                onNavigate={() => handleLocationDoubleClick('shared')}
                onQuickMove={() => handleQuickMove('shared')}
              />
            </>
          ) : (
            <>
              {/* Folder Items */}
              {myDriveFoldersResult.isLoading || sharedFilesResult.isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-600 border-t-sky-600 dark:border-t-sky-400"></div>
                </div>
              ) : displayFolders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No folders in this location
                </div>
              ) : (
                displayFolders.map(folder => (
                  <FolderItem
                    key={folder.uuid}
                    folder={folder}
                    isSelected={selectedTargetId === folder.uuid}
                    isHovered={hoveredFolderId === folder.uuid}
                    isDisabled={!isValidTarget(folder.uuid)}
                    onSingleClick={() => handleFolderSingleClick(folder.uuid)}
                    onDoubleClick={() => handleFolderDoubleClick(folder.uuid, folder.name)}
                    onHover={setHoveredFolderId}
                    onQuickMove={() => handleQuickMove(folder.uuid)}
                    onNavigate={() => handleFolderDoubleClick(folder.uuid, folder.name)}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedTargetId || !isValidTarget(selectedTargetId) || isMoving}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              !selectedTargetId || !isValidTarget(selectedTargetId) || isMoving
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-sky-600 dark:bg-sky-500 text-white hover:bg-sky-700 dark:hover:bg-sky-600'
            }`}
          >
            {isMoving ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}

// LocationItem Sub-component
interface LocationItemProps {
  icon: React.ReactNode
  name: string
  isSelected: boolean
  canSelect: boolean      // Can single-click to select as target
  canNavigate: boolean    // Can double-click or use chevron to navigate
  canQuickMove: boolean   // Can use "Move" button
  onClick: () => void
  onDoubleClick: () => void
  onNavigate: () => void
  onQuickMove: () => void
}

const LocationItem: React.FC<LocationItemProps> = ({
  icon,
  name,
  isSelected,
  canSelect,
  canNavigate,
  canQuickMove,
  onClick,
  onDoubleClick,
  onNavigate,
  onQuickMove
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Determine if the row should be interactive at all
  const isInteractive = canSelect || canNavigate

  // Determine cursor style based on capabilities
  const getCursorStyle = () => {
    if (!isInteractive) return 'cursor-not-allowed'
    if (canSelect) return 'cursor-pointer'
    if (canNavigate) return 'cursor-pointer'
    return 'cursor-default'
  }

  // Determine opacity - only fully disabled if can't do anything
  const getOpacity = () => {
    return isInteractive ? 'opacity-100' : 'opacity-50'
  }

  return (
    <div
      className={`
        p-3 rounded-md border flex items-center justify-between
        ${getCursorStyle()}
        ${getOpacity()}
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
        ${!isSelected && isHovered ? 'bg-gray-50 dark:bg-gray-800' : ''}
      `}
      onClick={canSelect ? onClick : undefined}
      onDoubleClick={canNavigate ? onDoubleClick : undefined}
      onMouseEnter={() => isInteractive && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
        {icon}
        <span className="text-sm font-medium">{name}</span>
      </div>
      {isHovered && isInteractive && (
        <div className="flex items-center gap-2">
          {canQuickMove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickMove()
              }}
              className="px-3 py-1 bg-sky-600 dark:bg-sky-500 text-white text-sm rounded hover:bg-sky-700 dark:hover:bg-sky-600"
            >
              Move
            </button>
          )}
          {canNavigate && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onNavigate()
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// FolderItem Sub-component
interface FolderItemProps {
  folder: FileItemBase
  isSelected: boolean
  isHovered: boolean
  isDisabled: boolean
  onSingleClick: () => void
  onDoubleClick: () => void
  onHover: (folderId: string | null) => void
  onQuickMove: () => void
  onNavigate: () => void
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  isSelected,
  isHovered,
  isDisabled,
  onSingleClick,
  onDoubleClick,
  onHover,
  onQuickMove,
  onNavigate
}) => {
  return (
    <div
      className={`
        p-3 rounded-md border flex items-center justify-between
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
        ${!isSelected && isHovered ? 'bg-gray-50 dark:bg-gray-800' : ''}
      `}
      onClick={isDisabled ? undefined : onSingleClick}
      onDoubleClick={isDisabled ? undefined : onDoubleClick}
      onMouseEnter={() => !isDisabled && onHover(folder.uuid)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-3">
        <Folder className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-900 dark:text-gray-100">{folder.name}</span>
      </div>

      {isHovered && !isDisabled && (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickMove()
            }}
            className="px-3 py-1 bg-sky-600 dark:bg-sky-500 text-white text-sm rounded hover:bg-sky-700 dark:hover:bg-sky-600"
          >
            Move
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNavigate()
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}

export default MoveFolderDialog
