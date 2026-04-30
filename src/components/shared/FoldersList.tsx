'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { ItemIcon } from '@/components/ui/ItemIcon'
import { useRouter } from 'next/navigation'
import { useDrag, useDrop } from 'react-dnd'
import { FileItemBase } from '@/types/api/ndex/File'
import { ItemTypes } from '@/types/dnd/DndTypes'
import { NDExFileType, Permission } from '@js4cytoscape/ndex-client'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { tableStyles, getRowClasses, getGridItemClasses, getThClasses, getTdClasses } from '@/components/shared/table-styles'
import { formatDate, getDisplayName } from '@/components/shared/table-utils'

// Helper function to check if folder is shared
const isSharedFolder = (folder: FileItemBase): boolean => {
  return Boolean((folder as any).isShared)
}

// Helper function to format permission display text
const formatPermission = (permission?: Permission): string => {
  if (!permission) return 'READ'
  return permission === Permission.WRITE ? 'EDIT' : permission
}

// Helper function to check if a shortcut's target is unavailable (in trash or deleted)
const isUnavailableShortcut = (item: FileItemBase): boolean => {
  return item.type === NDExFileType.SHORTCUT &&
         (item.attributes?.target_status === 'IN_TRASH' || item.attributes?.target_status === 'DELETED')
}

// Helper function to get the appropriate message for unavailable shortcuts
const getUnavailableShortcutMessage = (item: FileItemBase): string => {
  if (item.type !== NDExFileType.SHORTCUT) return ''

  if (item.attributes?.target_status === 'IN_TRASH') {
    return 'Original moved to trash'
  } else if (item.attributes?.target_status === 'DELETED') {
    return 'Original item deleted'
  }

  return ''
}

// Helper function to get text styling for unavailable shortcuts
const getUnavailableTextClass = (isUnavailable: boolean) =>
  isUnavailable ? "text-muted-foreground opacity-60" : "text-foreground"

// Helper function to check if the current user owns this item.
// Mirrors the pattern used in SearchResultsPage:
//   const isMine = currentUserName && item.owner === currentUserName
const isOwner = (item: FileItemBase, currentUserName: string | null): boolean => {
  if (!currentUserName) return false
  return item.owner === currentUserName
}

// Sort direction type (also accepts null for "unsorted" defaults)
type SortField = 'name' | 'modificationTime' | null
type SortDirection = 'asc' | 'desc' | null

// Props for the component
interface FoldersListProps {
  folders: FileItemBase[]
  tabState?: MyAccountTabType
  viewMode: 'grid' | 'list'
  readOnly?: boolean
  showOwnerColumn?: boolean
  showVisibilityColumn?: boolean
  showPermissionColumn?: boolean
  selectedItems?: string[]
  onSelect?: (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: NDExFileType,
    sortedItems: FileItemBase[],
  ) => void
  currentFolderId?: string | null
  onDrop?: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
  onRemoveShortcut?: (shortcutId: string) => Promise<void>
  defaultSort?: {
    field: SortField
    direction: SortDirection
  }
  sortable?: boolean
  onSortChange?: (field: SortField) => void
}



// Extended folder item with additional properties we might have
interface FolderItem extends FileItemBase {}

// Single folder grid item component
const GridFolderItem = ({
  folder,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDrop,
  onDropdownToggle,
  onRemoveShortcut,
  readOnly,
  currentUserName,
}: {
  folder: FolderItem
  index: number
  selectedItems: string[]
  onSelect: (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: NDExFileType,
    sortedItems: FileItemBase[],
  ) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDrop?: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
  onRemoveShortcut?: (shortcutId: string) => Promise<void>
  readOnly?: boolean
  currentUserName: string | null
}) => {
  const isSelected = selectedItems.includes(folder.uuid)
  const isUnavailable = isUnavailableShortcut(folder)
  const userOwns = isOwner(folder, currentUserName)
  const showRemoveButton = isUnavailable && !!onRemoveShortcut && userOwns

  // Drop target for any DRIVE_ITEM (only if not read-only and onDrop is provided, and folder is not an unavailable shortcut)
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged: any) => {
      if (!readOnly && onDrop && !isUnavailable) {
        onDrop(dragged.ids, folder.uuid)
      }
    },
    collect: (monitor) => ({
      isOver: !readOnly && onDrop && !isUnavailable && monitor.isOver(),
    }),
    canDrop: () => !readOnly && !!onDrop && !isUnavailable,
  })

  // Draggable source (only if not read-only)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: readOnly ? null : () => ({
      ids: selectedItems.includes(folder.uuid) ? selectedItems : [folder.uuid],
      type: folder.type,
    }),
    collect: (m) => ({ isDragging: !readOnly && m.isDragging() }),
    canDrag: !readOnly,
  })

  // Create a ref combining both drag and drop
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!readOnly) {
        drag(node)
        if (onDrop) {
          drop(node)
        }
      }
    },
    [drag, drop, readOnly, onDrop],
  )

  return (
    <div
      key={folder.uuid}
      data-item={folder.uuid}
      ref={ref}
      className={`
        ${getGridItemClasses(isSelected, isDragging, readOnly || false)}
        ${isOver ? 'border-accent bg-accent/20' : ''}
      `}
      onClick={(e) => onSelect?.(e, folder.uuid, index, folder.type, [])}
      onDoubleClick={(e) => onDoubleClick(e, folder.uuid)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <ItemIcon
              type={folder.type === NDExFileType.SHORTCUT ? NDExFileType.FOLDER : folder.type}
              isShortcut={folder.type === NDExFileType.SHORTCUT}
              isShared={isSharedFolder(folder)}
              className="h-5 w-5"
            />
          </div>
          {!readOnly && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              className={tableStyles.checkbox}
            />
          )}
        </div>
        {showRemoveButton ? (
          <button
            className="px-2 py-1 text-xs font-medium text-destructive hover:text-destructive/80
                       border border-destructive/20 hover:border-destructive/40 rounded-md
                       transition-colors duration-200"
            onClick={async (e) => {
              e.stopPropagation()
              try {
                await onRemoveShortcut!(folder.uuid)
              } catch (error) {
                console.error('Error removing shortcut:', error)
              }
            }}
          >
            Remove
          </button>
        ) : (
          onDropdownToggle && !isUnavailable && (
            <button
              className={tableStyles.button.dropdown}
              onClick={(e) => {
                e.stopPropagation()
                onDropdownToggle(e, folder.uuid,
                  folder.type === NDExFileType.SHORTCUT
                    ? (folder.attributes?.target_type as NDExFileType) || NDExFileType.FOLDER
                    : folder.type
                )
              }}
              data-dropdown-trigger
              data-dropdown-id={folder.uuid}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        )}
      </div>
      <div className="space-y-2">
        <h3 className={`${tableStyles.text.name} ${getUnavailableTextClass(isUnavailable)}`}>
          {getDisplayName(folder)}
        </h3>
      </div>
    </div>
  )
}

// Single folder list item component
const ListFolderItem = ({
  folder,
  tabState,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDrop,
  onDropdownToggle,
  onRemoveShortcut,
  showOwnerColumn,
  showVisibilityColumn,
  showPermissionColumn,
  readOnly,
  currentUserName,
}: {
  folder: FolderItem
  tabState?: MyAccountTabType
  index: number
  selectedItems: string[]
  onSelect: (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: NDExFileType,
    sortedItems: FileItemBase[],
  ) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDrop?: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
  onRemoveShortcut?: (shortcutId: string) => Promise<void>
  showOwnerColumn?: boolean
  showVisibilityColumn?: boolean
  showPermissionColumn?: boolean
  readOnly?: boolean
  currentUserName: string | null
}) => {
  const isSelected = selectedItems.includes(folder.uuid)
  const isUnavailable = isUnavailableShortcut(folder)
  const userOwns = isOwner(folder, currentUserName)
  const showRemoveButton = isUnavailable && !!onRemoveShortcut && userOwns

  // For list view, we'll make the name cell both draggable and a drop target
  // Disable drop for unavailable shortcuts
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged: any) => {
      if (!readOnly && onDrop && !isUnavailable) {
        onDrop(dragged.ids, folder.uuid)
      }
    },
    collect: (monitor) => ({
      isOver: !readOnly && onDrop && !isUnavailable && monitor.isOver(),
    }),
    canDrop: () => !readOnly && !!onDrop && !isUnavailable,
  })

  // Draggable source for the folder (only if not read-only)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: readOnly ? null : () => ({
      ids: selectedItems.includes(folder.uuid) ? selectedItems : [folder.uuid],
      type: folder.type,
    }),
    collect: (m) => ({ isDragging: !readOnly && m.isDragging() }),
    canDrag: !readOnly,
  })

  // Create a ref combining both drag and drop
  const ref = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (!readOnly) {
        drag(node)
        if (onDrop) {
          drop(node)
        }
      }
    },
    [drag, drop, readOnly, onDrop],
  )

  // Calculate colSpan for the unavailable message:
  // It needs to cover the columns between Name and Visibility/Permission/Actions.
  // Those columns are: Owner (optional), Last Modified (always present)
  const unavailableColSpan = (showOwnerColumn ? 1 : 0) + 1 // +1 for Last Modified

  return (
    <tr
      key={folder.uuid}
      data-item={folder.uuid}
      className={getRowClasses(isSelected, isDragging, readOnly || false)}
      onClick={(e) => onSelect?.(e, folder.uuid, index, folder.type, [])}
      onDoubleClick={(e) => onDoubleClick(e, folder.uuid)}
      ref={ref}
    >
      <td
        className={`${getTdClasses('left')} ${isOver ? 'bg-accent/50' : ''}`}
      >
        <div className="flex items-center w-full">
          <div className="flex-shrink-0 mr-3">
            <ItemIcon
              type={folder.type === NDExFileType.SHORTCUT ? NDExFileType.FOLDER : folder.type}
              isShortcut={folder.type === NDExFileType.SHORTCUT}
              isShared={isSharedFolder(folder)}
              className="h-5 w-5"
            />
          </div>
          <div className="overflow-hidden">
            <div className={`text-sm font-medium truncate max-w-[250px] ${getUnavailableTextClass(isUnavailable)}`}>
              {getDisplayName(folder)}
            </div>
          </div>
        </div>
      </td>
      {isUnavailable ? (
        // For unavailable shortcuts (trashed or deleted), span the message across Owner (if present) and Last Modified columns
        <td className={getTdClasses('left')} colSpan={unavailableColSpan}>
          <div className="flex items-center justify-start w-full text-sm text-muted-foreground italic">
            <span className="truncate">
              {getUnavailableShortcutMessage(folder)}
            </span>
          </div>
        </td>
      ) : (
        <>
          {showOwnerColumn && (
            <td className={getTdClasses('left')}>
              <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
                <span className="truncate">
                  {folder.owner || 'Me'}
                </span>
              </div>
            </td>
          )}
          <td className={getTdClasses('left')}>
            <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
              <span className="truncate">
                {formatDate(folder.modificationTime)}
              </span>
            </div>
          </td>
        </>
      )}
      {showVisibilityColumn !== false && (
        <td className={getTdClasses('center')}>
          <div className="flex justify-center w-full">
            {showRemoveButton ? (
              <button
                className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                           border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-md
                           transition-colors duration-200"
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    await onRemoveShortcut!(folder.uuid)
                  } catch (error) {
                    console.error('Error removing shortcut:', error)
                  }
                }}
              >
                Remove shortcut
              </button>
            ) : isUnavailable ? (
              // Non-owner viewing a dead shortcut: nothing in the visibility cell
              null
            ) : (
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full text-foreground ${
                  folder.visibility === 'PUBLIC'
                    ? 'bg-green-200 dark:bg-green-700/80'
                    : folder.visibility === 'UNLISTED'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : 'bg-blue-300 dark:bg-blue-700/70'
                }`}
              >
                {folder.visibility || 'PRIVATE'}
              </span>
            )}
          </div>
        </td>
      )}
      {showPermissionColumn && (
        <td className={getTdClasses('center')}>
          <div className="flex justify-center w-full">
            <span className="text-sm text-muted-foreground">
              {formatPermission(folder.permission)}
            </span>
          </div>
        </td>
      )}
      {onDropdownToggle && (
        <td className={getTdClasses('center')}>
          {!isUnavailable && (
            <button
              className={tableStyles.button.dropdown}
              onClick={(e) => {
                e.stopPropagation()
                onDropdownToggle(e, folder.uuid,
                  folder.type === NDExFileType.SHORTCUT
                    ? (folder.attributes?.target_type as NDExFileType) || NDExFileType.FOLDER
                    : folder.type
                )
              }}
              data-dropdown-trigger
              data-dropdown-id={folder.uuid}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </td>
      )}
    </tr>
  )
}

const FoldersList: React.FC<FoldersListProps> = ({
  folders,
  viewMode,
  tabState,
  readOnly = false,
  showOwnerColumn = false,
  showVisibilityColumn = true,
  showPermissionColumn = false,
  selectedItems = [],
  onSelect,
  onDrop,
  onDropdownToggle,
  onRemoveShortcut,
  defaultSort = { field: 'modificationTime', direction: 'desc' },
  sortable = true,
  onSortChange,
}) => {
  const router = useRouter()
  const config = useConfig()
  const { token, user } = useAuth()
  const currentUserName = user?.userName || null
  const [sortField, setSortField] = useState<SortField>(defaultSort.field)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort.direction)

  // Notify parent when active sort field changes (e.g. for "Reset" button visibility in search)
  useEffect(() => {
    onSortChange?.(sortField)
  }, [sortField, onSortChange])

  // Handle double click on folder to navigate into it
  const handleFolderDoubleClick = useCallback(
    async (event: React.MouseEvent, folderId: string) => {
      event.preventDefault()
      event.stopPropagation()

      if (tabState !== MyAccountTabType.TRASH) {
        // Find the folder in the folders array
        const folderItem = folders.find((folder) => folder.uuid === folderId)

        if (folderItem) {
          // Don't navigate for unavailable shortcuts (target trashed or deleted)
          if (isUnavailableShortcut(folderItem)) {
            return
          }

          // Check if it's a shortcut
          if (folderItem.type === NDExFileType.SHORTCUT) {
            try {
              // Get the NDEx client to fetch the shortcut
              const ndexClient = getNdexClient(config.ndexBaseUrl, token)
              const shortcut = await ndexClient.files.getShortcut(folderId)

              // Check if the target is a folder, if so navigate to it
              if (shortcut && shortcut.target) {
                router.push(`/folders/${shortcut.target}`)
                return
              }
            } catch (error) {
              console.error('Error fetching shortcut:', error)
            }
          }
        }

        // Default behavior - navigate to the folder directly
        router.push(`/folders/${folderId}`)
      }
    },
    [router, readOnly, tabState, folders, config.ndexBaseUrl, token]
  )

  // Handle sort column click
  const handleSortClick = (field: 'name' | 'modificationTime') => {
    // If clicking on the same field, toggle direction
    if (sortField === field) {
      const nextDirection: SortDirection =
        sortDirection === 'asc'
          ? 'desc'
          : sortDirection === 'desc'
          ? null
          : 'asc'
      setSortDirection(nextDirection)
      if (sortDirection === 'desc') {
        setSortField(null)
      }
    } else {
      // If clicking on a new field, set to ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort folders if needed
  const sortedFolderItems = [...folders]

  if (sortField && sortDirection) {
    sortedFolderItems.sort((a, b) => {
      let valueA: any
      let valueB: any

      if (sortField === 'name') {
        valueA = getDisplayName(a).toLowerCase()
        valueB = getDisplayName(b).toLowerCase()
      } else if (sortField === 'modificationTime') {
        valueA = a.modificationTime ? new Date(a.modificationTime).getTime() : 0
        valueB = b.modificationTime ? new Date(b.modificationTime).getTime() : 0
      } else {
        return 0
      }

      const direction = sortDirection === 'asc' ? 1 : -1

      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return 1 * direction

      // If primary sort values are equal, sort by name alphabetically
      if (valueA === valueB) {
        const nameA = getDisplayName(a).toLowerCase()
        const nameB = getDisplayName(b).toLowerCase()
        if (nameA < nameB) return -1
        if (nameA > nameB) return 1
      }

      return 0
    })
  }

  // Create a drop container for when there are no folders
  const [, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    // We don't do anything on drop here since there are no folders
    collect: () => ({}),
    canDrop: () => false,
  })

  if (folders.length === 0) {
    return (
      <div className="mb-4">
        <h2 className={tableStyles.text.title}>Folders</h2>
        <div ref={drop as any} className={tableStyles.empty}>
          No folders found
        </div>
      </div>
    )
  }

  // Renders sort icon based on field and current state
  const renderSortIcon = (field: 'name' | 'modificationTime') => {
    // If this field is being sorted
    if (sortField === field) {
      // Show prominent icon based on direction
      if (sortDirection === 'asc') {
        return <ArrowUp className="h-3 w-3 ml-1 inline-block text-foreground" />
      } else if (sortDirection === 'desc') {
        return <ArrowDown className="h-3 w-3 ml-1 inline-block text-foreground" />
      }
    }

    // Show a subtle icon by default (not actively sorted)
    return <ArrowUpDown className="h-3 w-3 ml-1 inline-block text-muted-foreground" />
  }

  return (
    <div className="mb-4">
      <h2 className={tableStyles.text.title}>Folders</h2>

      {viewMode === 'grid' ? (
        // Grid View
        <div className={tableStyles.grid.container}>
          {sortedFolderItems.map((folder, index) => (
            <GridFolderItem
              key={folder.uuid}
              folder={folder}
              index={index}
              selectedItems={selectedItems}
              onSelect={(e, id, idx, type) =>
                onSelect?.(e, id, idx, type, sortedFolderItems)
              }
              onDoubleClick={handleFolderDoubleClick}
              onDrop={onDrop}
              onDropdownToggle={onDropdownToggle}
              onRemoveShortcut={onRemoveShortcut}
              readOnly={readOnly}
              currentUserName={currentUserName}
            />
          ))}
        </div>
      ) : (
        // List View - Enhanced with table layout
        <div className={tableStyles.container}>
          <table className="min-w-full divide-y divide-border" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className={tableStyles.thead}>
              <tr>
                <th
                  scope="col"
                  className={getThClasses('left')}
                  style={{ minWidth: '200px' }}
                >
                  {sortable ? (
                    <button
                      className={tableStyles.button.sort}
                      onClick={() => handleSortClick('name')}
                    >
                      Name
                      {renderSortIcon('name')}
                    </button>
                  ) : (
                    <span>Name</span>
                  )}
                </th>
                {showOwnerColumn && (
                  <th
                    scope="col"
                    className={getThClasses('left')}
                    style={{ width: '160px', minWidth: '160px' }}
                  >
                    Owner
                  </th>
                )}
                <th
                  scope="col"
                  className={getThClasses('left')}
                  style={{ width: '170px', minWidth: '170px' }}
                >
                  {sortable ? (
                    <button
                      className="flex items-center justify-start focus:outline-none"
                      onClick={() => handleSortClick('modificationTime')}
                    >
                      Last Modified
                      {renderSortIcon('modificationTime')}
                    </button>
                  ) : (
                    <span>Last Modified</span>
                  )}
                </th>
                {showVisibilityColumn !== false && (
                  <th
                    scope="col"
                    className={getThClasses('center')}
                    style={{ width: '100px', minWidth: '100px' }}
                  >
                    Visibility
                  </th>
                )}
                {showPermissionColumn && (
                  <th
                    scope="col"
                    className={getThClasses('center')}
                    style={{ width: '100px', minWidth: '100px' }}
                  >
                    Permission
                  </th>
                )}
                {onDropdownToggle && (
                  <th
                    scope="col"
                    className={getThClasses('center')}
                    style={{ width: '80px', minWidth: '80px' }}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={tableStyles.tbody}>
              {sortedFolderItems.map((folder, index) => (
                <ListFolderItem
                  key={folder.uuid}
                  folder={folder}
                  tabState={tabState}
                  index={index}
                  selectedItems={selectedItems}
                  onSelect={(e, id, idx, type) =>
                    onSelect?.(e, id, idx, type, sortedFolderItems)
                  }
                  onDoubleClick={handleFolderDoubleClick}
                  onDrop={onDrop}
                  onDropdownToggle={onDropdownToggle}
                  onRemoveShortcut={onRemoveShortcut}
                  showOwnerColumn={showOwnerColumn}
                  showVisibilityColumn={showVisibilityColumn}
                  showPermissionColumn={showPermissionColumn}
                  readOnly={readOnly}
                  currentUserName={currentUserName}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FoldersList