'use client'

import React, { useState, useCallback } from 'react'
import {
  File,
  MoreVertical,
  Clock,
  User,
  Database,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrag } from 'react-dnd'
import { FolderItemBase } from '@/hooks/use-folder-contents'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { ItemTypes } from '@/types/dnd/DndTypes'
import { MyAccountTabType } from '@/types/api/ui/myAccount'
// Props for the component
interface NetworksListProps {
  items: FolderItemBase[]
  tabState: MyAccountTabType
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}

// Extended network item with additional properties we might have
interface NetworkItem extends FolderItemBase {}

// Sort direction type
type SortDirection = 'asc' | 'desc' | null

// Format date in a readable way
export const formatDate = (dateStr?: string | Date) => {
  if (!dateStr) return 'N/A'
  const date =
    typeof dateStr === 'string'
      ? dateStr
      : new Date(dateStr).toLocaleDateString()
  return date
}

// Format counts with commas for readability
const formatCount = (count?: number) => {
  if (count === undefined || count === null) return 'N/A'
  return count.toLocaleString()
}

// Single network grid item component
const GridNetworkItem = ({
  network,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDropdownToggle,
}: {
  network: NetworkItem
  index: number
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}) => {
  // Create drag source for network items
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: () => ({
      ids: selectedItems.includes(network.uuid)
        ? selectedItems
        : [network.uuid],
      type: 'NETWORK',
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  // Create a ref function for drag
  const dragRef = (element: HTMLDivElement | null) => {
    drag(element)
  }

  return (
    <div
      key={network.uuid}
      data-item
      ref={dragRef}
      className={`
        rounded-md border border-gray-200 cursor-pointer select-none
        p-2 flex items-center justify-between
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${
          selectedItems.includes(network.uuid)
            ? 'bg-sky-100'
            : 'hover:bg-gray-50'
        }
      `}
      onClick={(e) => onSelect(e, network.uuid, index)}
      onDoubleClick={(e) => onDoubleClick(e, network.uuid)}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0">
          <File className="h-5 w-5 text-sky-700" />
        </div>
        <span className="text-sm truncate">
          {network.name || 'Untitled Network'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="p-1 rounded-full hover:bg-gray-200"
          onClick={(e) =>
            onDropdownToggle && onDropdownToggle(e, network.uuid, 'network')
          }
          data-dropdown-trigger
          data-dropdown-id={network.uuid}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

// Single network list item component
const ListNetworkItem = ({
  network,
  tabState,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDropdownToggle,
}: {
  network: NetworkItem
  tabState: MyAccountTabType
  index: number
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  onDoubleClick: (event: React.MouseEvent, id: string) => void
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: 'folder' | 'network',
  ) => void
}) => {
  // For list view, we need to handle refs differently
  // Same approach as FoldersList - make the entire row draggable
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: () => ({
      ids: selectedItems.includes(network.uuid)
        ? selectedItems
        : [network.uuid],
      type: 'NETWORK',
    }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  // Create a ref function for drag using useCallback
  const dragRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      drag(element)
    },
    [drag],
  )

  return (
    <tr
      key={network.uuid}
      data-item
      ref={dragRef}
      className={`cursor-pointer ${isDragging ? 'opacity-50' : 'opacity-100'} ${
        selectedItems.includes(network.uuid) ? 'bg-sky-100' : 'hover:bg-gray-50'
      }`}
      onClick={(e) => onSelect(e, network.uuid, index)}
      onDoubleClick={(e) => onDoubleClick(e, network.uuid)}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center max-w-full">
          <div className="flex-shrink-0 mr-3">
            <File className="h-5 w-5 text-sky-700" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-black truncate max-w-[250px]">
              {network.name || 'Untitled Network'}
            </div>
          </div>
        </div>
      </td>
      {tabState === MyAccountTabType.SHARED && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center text-center text-sm text-gray-500">
            <User className="h-4 w-4 mr-1 text-gray-400" />
            <span className="truncate">
              {network.attributes?.owner || 'Me'}
            </span>
          </div>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <Database className="h-4 w-4 mr-1 text-gray-400" />
          <span className="truncate">
            {formatCount(network.attributes?.edges as number)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1 text-gray-400" />
          <span className="truncate">
            {formatDate(network.modificationTime)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          {network.attributes?.visibility || 'PRIVATE'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          className="p-1 rounded-full hover:bg-gray-200 inline-flex"
          onClick={(e) =>
            onDropdownToggle && onDropdownToggle(e, network.uuid, 'network')
          }
          data-dropdown-trigger
          data-dropdown-id={network.uuid}
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      </td>
    </tr>
  )
}

const NetworksList: React.FC<NetworksListProps> = ({
  items,
  tabState,
  viewMode,
  selectedItems,
  onSelect,
  onDropdownToggle,
}) => {
  const router = useRouter()
  const config = useConfig()
  const [sortField, setSortField] = useState<
    'name' | 'modificationTime' | null
  >(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Handle double click on network to open it
  const handleNetworkDoubleClick = (
    event: React.MouseEvent,
    networkId: string,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    // Open the network in a new tab using the NDEx viewer URL
    window.open(
      `https://${config.ndexBaseUrl}/viewer/networks/${networkId}`,
      '_blank',
    )
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

  // Filter to only show network items
  const networkItems = items.filter(
    (item) => item.type === 'NETWORK',
  ) as NetworkItem[]

  // Sort networks if needed
  const sortedNetworkItems = [...networkItems]

  if (sortField && sortDirection) {
    sortedNetworkItems.sort((a, b) => {
      let valueA: any
      let valueB: any

      if (sortField === 'name') {
        valueA = (a.name || 'Untitled Network').toLowerCase()
        valueB = (b.name || 'Untitled Network').toLowerCase()
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

  // Handle shift+click for range selection
  const handleItemClick = (
    event: React.MouseEvent,
    id: string,
    index: number,
  ) => {
    onSelect(event, id, index + networkItems.length)
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
    return <ArrowUpDown className="h-3 w-3 ml-1 inline-block text-gray-500" />
  }

  if (networkItems.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Networks</h2>
        <p className="text-sm text-gray-500">No networks found</p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-500 mb-2">Networks</h2>

      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {sortedNetworkItems.map((network, index) => (
            <GridNetworkItem
              key={network.uuid}
              network={network}
              index={index}
              selectedItems={selectedItems}
              onSelect={handleItemClick}
              onDoubleClick={handleNetworkDoubleClick}
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                >
                  <button
                    className="flex items-center focus:outline-none"
                    onClick={() => handleSortClick('name')}
                  >
                    Name
                    {renderSortIcon('name')}
                  </button>
                </th>
                {tabState === MyAccountTabType.SHARED && (
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                  >
                    Owner
                  </th>
                )}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                >
                  Edges
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                >
                  Visibility
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedNetworkItems.map((network, index) => (
                <ListNetworkItem
                  key={network.uuid}
                  tabState={tabState}
                  network={network}
                  index={index}
                  selectedItems={selectedItems}
                  onSelect={handleItemClick}
                  onDoubleClick={handleNetworkDoubleClick}
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

export default NetworksList
