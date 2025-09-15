'use client'

import React, { useState, useCallback } from 'react'
import {
  File,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDrag } from 'react-dnd'
import { FileItemBase } from '@/types/api/ndex/File'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { ItemTypes } from '@/types/dnd/DndTypes'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { tableStyles, getRowClasses, getGridItemClasses, getThClasses, getTdClasses } from '@/components/shared/table-styles'
import { formatDate, formatCount, getDisplayName } from '@/components/shared/table-utils'

// Props for the component
interface NetworksListProps {
  items: FileItemBase[]
  tabState?: MyAccountTabType
  viewMode: 'grid' | 'list'
  readOnly?: boolean
  showOwnerColumn?: boolean
  showVisibilityColumn?: boolean
  selectedItems?: string[]
  onSelect?: (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: NDExFileType,
    sortedItems: FileItemBase[],
  ) => void
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


// Extended network item with additional properties we might have
interface NetworkItem extends FileItemBase {}

// Sort direction type
type SortDirection = 'asc' | 'desc' | null

// Single network grid item component
const GridNetworkItem = ({
  network,
  index,
  selectedItems,
  onSelect,
  onDoubleClick,
  onDropdownToggle,
  readOnly,
}: {
  network: NetworkItem
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
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
  readOnly?: boolean
}) => {
  const isSelected = selectedItems.includes(network.uuid)
  
  // Create drag source for network items (only if not read-only)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: readOnly ? null : () => ({
      ids: selectedItems.includes(network.uuid)
        ? selectedItems
        : [network.uuid],
      type: network.type,
    }),
    collect: (monitor) => ({ isDragging: !readOnly && monitor.isDragging() }),
    canDrag: !readOnly,
  })

  // Create a ref function for drag
  const dragRef = useCallback((element: HTMLDivElement | null) => {
    if (!readOnly) {
      drag(element)
    }
  }, [drag, readOnly])

  return (
    <div
      key={network.uuid}
      data-item={network.uuid}
      ref={dragRef}
      className={getGridItemClasses(isSelected, isDragging, readOnly || false)}
      onClick={(e) => onSelect?.(e, network.uuid, index, network.type, [])}
      onDoubleClick={(e) => onDoubleClick(e, network.uuid)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            {network.type === NDExFileType.NETWORK ? (
              <File className="h-5 w-5 text-sky-700" />
            ) : (
              <File className="h-5 w-5 text-green-600" />
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
              onDropdownToggle(e, network.uuid, network.type)
            }}
            data-dropdown-trigger
            data-dropdown-id={network.uuid}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="space-y-2">
        <h3 className={tableStyles.text.name}>
          {getDisplayName(network, 'Untitled Network')}
        </h3>
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
  showOwnerColumn,
  showVisibilityColumn,
  readOnly,
}: {
  network: NetworkItem
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
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
  showOwnerColumn?: boolean
  showVisibilityColumn?: boolean
  readOnly?: boolean
}) => {
  const isSelected = selectedItems.includes(network.uuid)
  
  // For list view, we need to handle refs differently
  // Same approach as FoldersList - make the entire row draggable
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DRIVE_ITEM,
    item: readOnly ? null : () => ({
      ids: selectedItems.includes(network.uuid)
        ? selectedItems
        : [network.uuid],
      type: network.type,
    }),
    collect: (monitor) => ({ isDragging: !readOnly && monitor.isDragging() }),
    canDrag: !readOnly,
  })

  // Create a ref function for drag using useCallback
  const dragRef = useCallback(
    (element: HTMLTableRowElement | null) => {
      if (!readOnly) {
        drag(element)
      }
    },
    [drag, readOnly],
  )

  return (
    <tr
      key={network.uuid}
      data-item={network.uuid}
      ref={dragRef}
      className={getRowClasses(isSelected, isDragging, readOnly || false)}
      onClick={(e) => onSelect?.(e, network.uuid, index, network.type, [])}
      onDoubleClick={(e) => onDoubleClick(e, network.uuid)}
    >
      <td className={getTdClasses('left')}>
        <div className="flex items-center w-full">
          <div className="flex-shrink-0 mr-3">
            {network.type === NDExFileType.NETWORK ? (
              <File className="h-5 w-5 text-sky-700" />
            ) : (
              <File className="h-5 w-5 text-green-600" />
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-foreground truncate">
              {getDisplayName(network, 'Untitled Network')}
            </div>
          </div>
        </div>
      </td>
      {showOwnerColumn && tabState === MyAccountTabType.SHARED && (
        <td className={getTdClasses('center')}>
          <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
            <span className="truncate">
              {network.attributes?.owner || 'Me'}
            </span>
          </div>
        </td>
      )}
      <td className={getTdClasses('right')}>
        <div className="flex items-center justify-end w-full text-sm text-muted-foreground">
          <span className="truncate">
            {formatCount(
              network.attributes?.edges ||
              network.attributes?.edgeCount ||
              (network as any).edgeCount ||
              0
            )}
          </span>
        </div>
      </td>
      <td className={getTdClasses('left')}>
        <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
          <span className="truncate">
            {formatDate(network.modificationTime)}
          </span>
        </div>
      </td>
      {showVisibilityColumn && (
        <td className={getTdClasses('center')}>
          <div className="flex justify-center w-full">
            <span 
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full text-foreground ${
                network.attributes?.visibility === 'PUBLIC'
                  ? 'bg-green-200 dark:bg-green-800/60'
                  : 'bg-blue-300 dark:bg-blue-700/70'
              }`}
            >
              {network.attributes?.visibility || 'PRIVATE'}
            </span>
          </div>
        </td>
      )}
      <td className={getTdClasses('center')}>
        {onDropdownToggle && (
          <button
            className={tableStyles.button.dropdown}
            onClick={(e) => {
              e.stopPropagation()
              onDropdownToggle(e, network.uuid, network.type)
            }}
            data-dropdown-trigger
            data-dropdown-id={network.uuid}
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </td>
    </tr>
  )
}

const NetworksList: React.FC<NetworksListProps> = ({
  items,
  tabState,
  viewMode,
  readOnly = false,
  showOwnerColumn = false,
  showVisibilityColumn = true,
  selectedItems = [],
  onSelect,
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

  // Handle double click on network to open it
  const handleNetworkDoubleClick = useCallback(
    async (event: React.MouseEvent, networkId: string) => {
      event.preventDefault()
      event.stopPropagation()

      if (readOnly) {
        // For read-only mode, open network in new tab using NDEx viewer
        // Find the network in the items array
        const networkItem = items.find((item) => item.uuid === networkId)
        
        if (networkItem && networkItem.type === NDExFileType.SHORTCUT) {
          try {
            // Get the NDEx client to fetch the shortcut
            const ndexClient = getNdexClient(config.ndexBaseUrl, token)
            const shortcut = await ndexClient.files.getShortcut(networkId)
            
            if (shortcut && shortcut.target) {
              // Open the target network in a new tab
              window.open(
                `https://${config.ndexBaseUrl}/viewer/networks/${shortcut.target}`,
                '_blank',
              )
              return
            }
          } catch (error) {
            console.error('Error fetching shortcut:', error)
          }
        }
        
        // Default behavior - open the network directly
        window.open(
          `https://${config.ndexBaseUrl}/viewer/networks/${networkId}`,
          '_blank',
        )
      } else {
        // For editable mode, navigate to network view
        if (tabState !== MyAccountTabType.TRASH) {
          // Find the network in the items array
          const networkItem = items.find((item) => item.uuid === networkId)

          if (networkItem) {
            // Check if it's a shortcut
            if (networkItem.type === NDExFileType.SHORTCUT) {
              try {
                // Get the NDEx client to fetch the shortcut
                const ndexClient = getNdexClient(config.ndexBaseUrl, token)
                const shortcut = await ndexClient.files.getShortcut(networkId)

                if (shortcut && shortcut.target) {
                  // Open the target network in a new tab
                  window.open(
                    `https://${config.ndexBaseUrl}/viewer/networks/${shortcut.target}`,
                    '_blank',
                  )
                  return
                }
              } catch (error) {
                console.error('Error fetching shortcut:', error)
              }
            }
          }

          // Default behavior - open the network directly
          window.open(
            `https://${config.ndexBaseUrl}/viewer/networks/${networkId}`,
            '_blank',
          )
        }
      }
    },
    [router, readOnly, items, config.ndexBaseUrl, token, tabState]
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

  // Sort networks if needed
  const sortedNetworkItems = [...items]

  if (sortField && sortDirection) {
    sortedNetworkItems.sort((a, b) => {
      let valueA: any
      let valueB: any

      if (sortField === 'name') {
        valueA = getDisplayName(a, 'Untitled Network').toLowerCase()
        valueB = getDisplayName(b, 'Untitled Network').toLowerCase()
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
        const nameA = getDisplayName(a, 'Untitled Network').toLowerCase()
        const nameB = getDisplayName(b, 'Untitled Network').toLowerCase()
        if (nameA < nameB) return -1
        if (nameA > nameB) return 1
      }

      return 0
    })
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

  if (items.length === 0) {
    return (
      <div className="mb-4">
        <h2 className={tableStyles.text.title}>Networks</h2>
        <p className={tableStyles.empty}>No networks found</p>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <h2 className={tableStyles.text.title}>Networks</h2>

      {viewMode === 'grid' ? (
        // Grid View
        <div className={tableStyles.grid.container}>
          {sortedNetworkItems.map((network, index) => (
            <GridNetworkItem
              key={network.uuid}
              network={network}
              index={index}
              selectedItems={selectedItems}
              onSelect={(e, id, idx, type) =>
                onSelect?.(e, id, idx, type, sortedNetworkItems)
              }
              onDoubleClick={handleNetworkDoubleClick}
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
                {showOwnerColumn && tabState === MyAccountTabType.SHARED && (
                  <th
                    scope="col"
                    className={getThClasses('center')}
                    style={{ width: '100px', minWidth: '100px' }}
                  >
                    Owner
                  </th>
                )}
                <th
                  scope="col"
                  className={getThClasses('right')}
                  style={{ width: '90px', minWidth: '90px' }}
                >
                  Edges
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
                {showVisibilityColumn && (
                  <th
                    scope="col"
                    className={getThClasses('center')}
                    style={{ width: '100px', minWidth: '100px' }}
                  >
                    Visibility
                  </th>
                )}
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
              {sortedNetworkItems.map((network, index) => (
                <ListNetworkItem
                  key={network.uuid}
                  tabState={tabState}
                  network={network}
                  index={index}
                  selectedItems={selectedItems}
                  onSelect={(e, id, idx, type) =>
                    onSelect?.(e, id, idx, type, sortedNetworkItems)
                  }
                  onDoubleClick={handleNetworkDoubleClick}
                  onDropdownToggle={onDropdownToggle}
                  showOwnerColumn={showOwnerColumn}
                  showVisibilityColumn={showVisibilityColumn}
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

export default NetworksList
export { formatDate } from '@/components/shared/table-utils'