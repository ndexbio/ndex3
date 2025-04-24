'use client'

import React, { useCallback, useState } from 'react'
import {
  Folder,
  MoreVertical,
  Clock,
  User,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrag, useDrop } from 'react-dnd'
import { FolderItemBase } from '@/hooks/use-folder-contents'
import { ItemTypes } from '@/types/dnd/DndTypes'

// Props for the component
interface FoldersListProps {
  folders: FolderItemBase[]
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  currentFolderId: string | null
  onDrop: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}

// Extended folder item with additional properties we might have
interface FolderItem extends FolderItemBase {}

// Sort direction type
type SortDirection = 'asc' | 'desc' | null

// Format date in a readable way
const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'N/A'
  const date =
    typeof dateStr === 'string'
      ? dateStr
      : new Date(dateStr).toLocaleDateString()
  return date
}

// Format count with commas for readability
const formatCount = (count?: number) => {
  if (count === undefined || count === null) return 'N/A'
  return count.toLocaleString()
}

// Single folder grid item component
const GridFolderItem = ({
  folder,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDrop,
  onDropdownToggle,
}: {
  folder: FolderItem
  index: number
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDrop: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}) => {
  // Drop target for any DRIVE_ITEM
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged) => onDrop((dragged as any).ids, folder.uuid),
    collect: (m) => ({ isOver: m.isOver() }),
  })

  // Draggable source
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: () => ({
      ids: selectedItems.includes(folder.uuid) ? selectedItems : [folder.uuid],
      type: 'FOLDER',
    }),
    collect: (m) => ({ isDragging: m.isDragging() }),
  })

  // Create a ref combining both drag and drop
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      drag(node)
      drop(node)
    },
    [drag, drop],
  )

  return (
    <div
      key={folder.uuid}
      data-item
      ref={ref}
      className={`
        rounded-md border border-gray-200 cursor-pointer select-none
        p-2 flex items-center justify-between
        ${isOver ? 'bg-blue-50 border-blue-300' : ''}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${
          selectedItems.includes(folder.uuid)
            ? 'bg-blue-100'
            : 'hover:bg-gray-50'
        }
      `}
      onClick={(e) => onSelect(e, folder.uuid, index)}
      onDoubleClick={(e) => onDoubleClick(e, folder.uuid)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0">
          <Folder className="h-5 w-5 text-gray-600" />
        </div>
        <span className="text-sm truncate">{folder.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-1 rounded-full hover:bg-gray-200"
          onClick={(e) =>
            onDropdownToggle && onDropdownToggle(e, folder.uuid, 'folder')
          }
          data-dropdown-trigger
          data-dropdown-id={folder.uuid}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
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
}: {
  folder: FolderItem
  index: number
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDrop: (itemIds: string[], targetFolderId: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}) => {
  // For list view, we'll make the name cell both draggable and a drop target
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    drop: (dragged) => onDrop((dragged as any).ids, folder.uuid),
    collect: (m) => ({ isOver: m.isOver() }),
  })

  // Draggable source for the folder
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: () => ({
      ids: selectedItems.includes(folder.uuid) ? selectedItems : [folder.uuid],
      type: 'FOLDER',
    }),
    collect: (m) => ({ isDragging: m.isDragging() }),
  })

  // Create a ref combining both drag and drop
  const ref = useCallback(
    (node: HTMLTableRowElement | null) => {
      drag(node)
      drop(node)
    },
    [drag, drop],
  )

  return (
    <tr
      key={folder.uuid}
      data-item
      className={`cursor-pointer 
        ${isDragging ? 'opacity-50' : 'opacity-100'} 
        ${
          selectedItems.includes(folder.uuid)
            ? 'bg-blue-100'
            : 'hover:bg-gray-50'
        }
      `}
      onClick={(e) => onSelect(e, folder.uuid, index)}
      onDoubleClick={(e) => onDoubleClick(e, folder.uuid)}
      ref={ref}
    >
      <td
        className={`px-6 py-4 whitespace-nowrap ${isOver ? 'bg-blue-50' : ''}`}
      >
        <div className="flex items-center max-w-full">
          <div className="flex-shrink-0 mr-3">
            <Folder className="h-5 w-5 text-gray-600" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
              {folder.name}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <User className="h-4 w-4 mr-1 text-gray-400" />
          <span className="truncate">{folder.attributes?.owner || 'Me'}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1 text-gray-400" />
          <span className="truncate">
            {formatDate(folder.modificationTime)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          className="p-1 rounded-full hover:bg-gray-200 inline-flex"
          onClick={(e) =>
            onDropdownToggle && onDropdownToggle(e, folder.uuid, 'folder')
          }
          data-dropdown-trigger
          data-dropdown-id={folder.uuid}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      </td>
    </tr>
  )
}

const FoldersList: React.FC<FoldersListProps> = ({
  folders,
  viewMode,
  selectedItems,
  onSelect,
  currentFolderId,
  onDrop,
  onDropdownToggle,
}) => {
  const router = useRouter()
  const [sortField, setSortField] = useState<
    'name' | 'modificationTime' | null
  >(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Handle double click on folder to navigate into it
  const handleFolderDoubleClick = (
    event: React.MouseEvent,
    folderId: string,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    // Navigate to the folder view
    router.push(`/folder/${folderId}`)
  }

  // Handle item click with proper event passing
  const handleItemClick = (
    event: React.MouseEvent,
    id: string,
    index: number,
  ) => {
    onSelect(event, id, index)
  }

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

  // Filter out network items - this component only shows folders
  const folderItems = folders.filter(
    (item) => item.type === 'FOLDER',
  ) as FolderItem[]

  // Sort folders if needed
  const sortedFolderItems = [...folderItems]

  if (sortField && sortDirection) {
    sortedFolderItems.sort((a, b) => {
      let valueA: any
      let valueB: any

      if (sortField === 'name') {
        valueA = a.name?.toLowerCase() || ''
        valueB = b.name?.toLowerCase() || ''
      } else if (sortField === 'modificationTime') {
        valueA = a.modificationTime ? new Date(a.modificationTime).getTime() : 0
        valueB = b.modificationTime ? new Date(b.modificationTime).getTime() : 0
      } else {
        return 0
      }

      const direction = sortDirection === 'asc' ? 1 : -1

      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return 1 * direction
      return 0
    })
  }

  // Create a drop container for when there are no folders
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.DRIVE_ITEM,
    // We don't do anything on drop here since there are no folders
    collect: (m) => ({ isOver: m.isOver() }),
  })

  if (folderItems.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>
        <div ref={drop as any} className="text-sm text-gray-500">
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
        return <ArrowUp className="h-3 w-3 ml-1 inline-block text-gray-800" />
      } else if (sortDirection === 'desc') {
        return <ArrowDown className="h-3 w-3 ml-1 inline-block text-gray-800" />
      }
    }

    // Show a subtle icon by default (not actively sorted)
    return <ArrowUpDown className="h-3 w-3 ml-1 inline-block text-gray-400" />
  }

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>

      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {sortedFolderItems.map((folder, index) => (
            <GridFolderItem
              key={folder.uuid}
              folder={folder}
              index={index}
              selectedItems={selectedItems}
              onSelect={handleItemClick}
              onDoubleClick={handleFolderDoubleClick}
              onDrop={onDrop}
              onDropdownToggle={onDropdownToggle}
            />
          ))}
        </div>
      ) : (
        // List View - Enhanced with table layout
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5"
                >
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSortClick('name')}
                  >
                    Name
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5"
                >
                  Owner
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5"
                >
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSortClick('modificationTime')}
                  >
                    Last Modified
                    {renderSortIcon('modificationTime')}
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedFolderItems.map((folder, index) => (
                <ListFolderItem
                  key={folder.uuid}
                  folder={folder}
                  index={index}
                  selectedItems={selectedItems}
                  onSelect={handleItemClick}
                  onDoubleClick={handleFolderDoubleClick}
                  onDrop={onDrop}
                  onDropdownToggle={onDropdownToggle}
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
