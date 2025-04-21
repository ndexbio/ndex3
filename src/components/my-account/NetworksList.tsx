'use client'

import React from 'react'
import { File, MoreVertical, Clock, User, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrag } from 'react-dnd'
import { FolderItemBase } from '@/hooks/use-folder-contents'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { ItemTypes } from '@/types/dnd/DndTypes'
// Props for the component
interface NetworksListProps {
  items: FolderItemBase[]
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  currentFolderId: string | null
}

// Extended network item with additional properties we might have
interface NetworkItem extends FolderItemBase {}

const NetworksList: React.FC<NetworksListProps> = ({
  items,
  viewMode,
  selectedItems,
  onSelect,
  currentFolderId,
}) => {
  const router = useRouter()
  const config = useConfig()

  // Helper to determine network icon
  const getNetworkIcon = () => {
    return <File className="h-5 w-5 text-sky-700" />
  }

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

  // Format date in a readable way
  const formatDate = (dateStr?: string | Date) => {
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

  // Filter to only show network items
  const networkItems = items.filter(
    (item) => item.type === 'NETWORK',
  ) as NetworkItem[]

  // Handle shift+click for range selection
  const handleItemClick = (
    event: React.MouseEvent,
    id: string,
    index: number,
  ) => {
    onSelect(event, id, index + networkItems.length)
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
          {networkItems.map((network, index) => {
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

            // Create a ref function that only handles drag (no drop for networks)
            const refFn = (el: HTMLDivElement | null) => {
              drag(el)
            }

            return (
              <div
                key={network.uuid}
                data-item
                ref={refFn}
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
                onClick={(e) => handleItemClick(e, network.uuid, index)}
                onDoubleClick={(e) => handleNetworkDoubleClick(e, network.uuid)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex-shrink-0">{getNetworkIcon()}</div>
                  <span className="text-sm truncate">
                    {network.name || 'Untitled Network'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-1 rounded-full hover:bg-gray-200">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            )
          })}
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
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                >
                  Owner
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6"
                >
                  Last Modified
                </th>
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
              {networkItems.map((network, index) => {
                // For list view, we need to handle refs differently
                // We can't attach drag directly to <tr> elements
                // Instead, we'll make just the first cell draggable
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

                // Create a ref function that only handles drag
                const refFn = (el: HTMLTableCellElement | null) => {
                  drag(el)
                }

                return (
                  <tr
                    key={network.uuid}
                    data-item
                    className={`cursor-pointer ${
                      isDragging ? 'opacity-50' : 'opacity-100'
                    } ${
                      selectedItems.includes(network.uuid)
                        ? 'bg-sky-100'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={(e) => handleItemClick(e, network.uuid, index)}
                    onDoubleClick={(e) =>
                      handleNetworkDoubleClick(e, network.uuid)
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap" ref={refFn}>
                      <div className="flex items-center max-w-full">
                        <div className="flex-shrink-0 mr-3">
                          {getNetworkIcon()}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-black truncate max-w-[250px]">
                            {network.name || 'Untitled Network'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="truncate">
                          {network.attributes?.owner || 'Me'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDate(network.modificationTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {network.attributes?.edges ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {network.attributes?.visibility ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button className="p-1 rounded-full hover:bg-gray-200 inline-flex">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default NetworksList
