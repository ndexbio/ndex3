'use client'

import React, { useCallback, useState } from 'react'
import {
  Folder,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrag, useDrop } from 'react-dnd'
import { FileItemBase } from '@/types/api/ndex/File'
import { ItemTypes } from '@/types/dnd/DndTypes'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { tableStyles, getRowClasses, getGridItemClasses, getThClasses, getTdClasses } from '@/components/shared/table-styles'
import { formatDate, getDisplayName } from '@/components/shared/table-utils'

// Props for the component
interface FoldersListProps {
  folders: FileItemBase[]
  tabState?: MyAccountTabType
  viewMode: 'grid' | 'list'
  readOnly?: boolean
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
  defaultSort?: {
    field: 'name' | 'modificationTime'
    direction: 'asc' | 'desc'
  }
}



// Extended folder item with additional properties we might have
interface FolderItem extends FileItemBase {}

// Sort direction type
type SortDirection = 'asc' | 'desc' | null

// Single folder grid item component
const GridFolderItem = ({
  folder,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDrop,
  onDropdownToggle,
  readOnly,
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
  readOnly?: boolean
}) => {
  const isSelected = selectedItems.includes(folder.uuid)

  // Drop target for any DRIVE_ITEM (only if not read-only and onDrop is provided)
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged: any) => {
      if (!readOnly && onDrop) {
        onDrop(dragged.ids, folder.uuid)
      }
    },
    collect: (monitor) => ({ 
      isOver: !readOnly && onDrop && monitor.isOver(),
    }),
    canDrop: () => !readOnly && !!onDrop,
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
            {folder.type === NDExFileType.FOLDER ? (
              <Folder className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Folder className="h-5 w-5 text-green-600" />
            )}
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
        {onDropdownToggle && (
          <button
            className={tableStyles.button.dropdown}
            onClick={(e) => {
              e.stopPropagation()
              onDropdownToggle(e, folder.uuid, folder.type)
            }}
            data-dropdown-trigger
            data-dropdown-id={folder.uuid}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        <h3 className={tableStyles.text.name}>
          {getDisplayName(folder)}
        </h3>
      </div>
    </div>
  )
}

// Single folder list item component
const ListFolderItem = ({
  folder,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDrop,
  onDropdownToggle,
  readOnly,
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
  readOnly?: boolean
}) => {
  const isSelected = selectedItems.includes(folder.uuid)

  // For list view, we'll make the name cell both draggable and a drop target
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged: any) => {
      if (!readOnly && onDrop) {
        onDrop(dragged.ids, folder.uuid)
      }
    },
    collect: (monitor) => ({ 
      isOver: !readOnly && onDrop && monitor.isOver(),
    }),
    canDrop: () => !readOnly && !!onDrop,
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
            {folder.type === NDExFileType.FOLDER ? (
              <Folder className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Folder className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-foreground truncate max-w-[250px]">
              {getDisplayName(folder)}
            </div>
          </div>
        </div>
      </td>
      <td className={getTdClasses('left')}>
        <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
          <span className="truncate">
            {formatDate(folder.modificationTime)}
          </span>
        </div>
      </td>
      <td className={getTdClasses('center')}>
        <div className="flex justify-center w-full">
          <span 
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full text-foreground ${
              folder.attributes?.visibility === 'PUBLIC'
                ? 'bg-green-200 dark:bg-green-800/60'
                : 'bg-blue-300 dark:bg-blue-700/70'
            }`}
          >
            {folder.attributes?.visibility || 'PRIVATE'}
          </span>
        </div>
      </td>
      <td className={getTdClasses('center')}>
        {onDropdownToggle && (
          <button
            className={tableStyles.button.dropdown}
            onClick={(e) => {
              e.stopPropagation()
              onDropdownToggle(e, folder.uuid, folder.type)
            }}
            data-dropdown-trigger
            data-dropdown-id={folder.uuid}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </td>
    </tr>
  )
}

const FoldersList: React.FC<FoldersListProps> = ({
  folders,
  viewMode,
  tabState,
  readOnly = false,
  selectedItems = [],
  onSelect,
  onDrop,
  onDropdownToggle,
  defaultSort = { field: 'modificationTime', direction: 'desc' },
}) => {
  const router = useRouter()
  const config = useConfig()
  const { token } = useAuth()
  const [sortField, setSortField] = useState<
    'name' | 'modificationTime' | null
  >(defaultSort.field)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort.direction)

  // Handle double click on folder to navigate into it
  const handleFolderDoubleClick = useCallback(
    async (event: React.MouseEvent, folderId: string) => {
      event.preventDefault()
      event.stopPropagation()

      if (!readOnly && tabState !== MyAccountTabType.TRASH) {
        // Find the folder in the folders array
        const folderItem = folders.find((folder) => folder.uuid === folderId)

        if (folderItem) {
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
      setSortDirection(
        sortDirection === 'asc'
          ? 'desc'
          : sortDirection === 'desc'
          ? null
          : 'asc',
      )
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
              readOnly={readOnly}
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
                  <button
                    className={tableStyles.button.sort}
                    onClick={() => handleSortClick('name')}
                  >
                    Name
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th
                  scope="col"
                  className={getThClasses('left')}
                  style={{ width: '170px', minWidth: '170px' }}
                >
                  <button
                    className="flex items-center justify-start focus:outline-none"
                    onClick={() => handleSortClick('modificationTime')}
                  >
                    Last Modified
                    {renderSortIcon('modificationTime')}
                  </button>
                </th>
                <th
                  scope="col"
                  className={getThClasses('center')}
                  style={{ width: '100px', minWidth: '100px' }}
                >
                  Visibility
                </th>
                <th
                  scope="col"
                  className={getThClasses('center')}
                  style={{ width: '80px', minWidth: '80px' }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={tableStyles.tbody}>
              {sortedFolderItems.map((folder, index) => (
                <ListFolderItem
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
                  readOnly={readOnly}
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