'use client'

import React, { useState, useEffect, useRef } from 'react'
import SideBar from './SideBar'
import {
  Grid,
  List,
  Info,
  X,
  Folder,
  File,
  ChevronDown,
  ArrowUpDown,
  MoreVertical,
  Filter,
  Search,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { useUserNetwork } from '@/hooks/use-user-network'
import { useConfig } from '@/lib/contexts/ConfigContext'
import NetworksList from './NetworksList'
import { NetworkSummary } from '@/types/api/ndex/NetworkSummary'

// Define interfaces for items
interface FolderItem {
  id: number
  name: string
  type: 'folder'
  modified: string
}

interface NetworkItem {
  id: number
  name: string
  type: 'network'
  modified: string
  originalData: NetworkSummary
}

type Item = FolderItem | NetworkItem

// Mock data for folders
const FOLDERS_DATA: FolderItem[] = [
  { id: 1, name: 'UCSD', type: 'folder', modified: '2023-06-15' },
  { id: 2, name: 'Taichi_Gravity_Sim', type: 'folder', modified: '2023-07-20' },
  { id: 3, name: 'style_transfer', type: 'folder', modified: '2023-08-05' },
  { id: 4, name: 'Self_Intro', type: 'folder', modified: '2023-09-10' },
  { id: 5, name: 'output', type: 'folder', modified: '2023-10-01' },
  { id: 6, name: 'ECE271b', type: 'folder', modified: '2023-11-15' },
  { id: 7, name: 'drugDataset', type: 'folder', modified: '2023-12-20' },
  { id: 8, name: 'CV_HuggingFace', type: 'folder', modified: '2024-01-25' },
  { id: 9, name: 'CV', type: 'folder', modified: '2024-02-10' },
  { id: 10, name: 'Colab Notebooks', type: 'folder', modified: '2024-03-01' },
]

export default function MyAccount() {
  const config = useConfig()
  const { isAuthenticated, token, tokenParsed, isInitializing } = useAuth()

  // State for UI controls
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  )
  // Add state to track which dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)

  // Reference to detect clicks outside the dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

  // Use the updated useUserNetwork hook with offset and limit parameters
  const { data: networks, isLoading, error, isEmpty } = useUserNetwork(0, 500)

  // Convert network data to the format expected by the UI
  const NETWORK_DATA = React.useMemo<NetworkItem[]>(() => {
    if (!networks || networks.length === 0) return []

    // Map network data to the format used by the UI
    // Starting ID from after the last folder ID (10)
    return networks.map((network: NetworkSummary, index: number) => ({
      id: 11 + index,
      name: network.name,
      type: 'network' as const,
      modified: new Date(network.modificationTime).toLocaleDateString(),
      // Store the original network data for reference
      originalData: network,
    }))
  }, [networks])

  // Combine folders and networks
  const ALL_ITEMS = React.useMemo<Item[]>(() => {
    return [...FOLDERS_DATA, ...NETWORK_DATA]
  }, [NETWORK_DATA])

  // Redirect if not authenticated
  useEffect(() => {
    // Don't redirect while Keycloak is still initializing
    if (isInitializing) {
      return
    }

    // Only redirect if not authenticated after initialization is complete
    if (!isAuthenticated || !token) {
      router.push('/')
    }
  }, [isAuthenticated, token, router, isInitializing])

  // Close details when no items are selected
  useEffect(() => {
    if (selectedItems.length === 0 && detailsOpen) {
      setDetailsOpen(false)
    }
  }, [selectedItems, detailsOpen])

  // Handle network click
  const handleNetworkClick = (networkId: string, event: React.MouseEvent) => {
    // Prevent triggering the item select handler
    event.stopPropagation()

    // Navigate to the network view page
    router.push(`/network/${networkId}`)
  }

  // Handle selection with modifiers
  const handleItemSelect = (
    event: React.MouseEvent,
    id: number,
    index: number,
  ) => {
    // Command/Control key for non-contiguous selection
    if (event.metaKey || event.ctrlKey) {
      if (selectedItems.includes(id)) {
        setSelectedItems(selectedItems.filter((item) => item !== id))
      } else {
        setSelectedItems([...selectedItems, id])
      }
      setLastSelectedIndex(index)
    }
    // Shift key for range selection
    else if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const itemsInRange = ALL_ITEMS.slice(start, end + 1).map(
        (item) => item.id,
      )
      setSelectedItems([...new Set([...selectedItems, ...itemsInRange])])
    }
    // Normal click for single selection
    else {
      setSelectedItems([id])
      setLastSelectedIndex(index)

      // Open details on single selection
      if (selectedItems.length <= 1) {
        setDetailsOpen(true)
      }
    }
  }

  // Handle dropdown toggle
  const handleDropdownToggle = (event: React.MouseEvent, networkId: number) => {
    event.stopPropagation()
    setOpenDropdownId(openDropdownId === networkId ? null : networkId)
  }

  // Handle dropdown option selection
  const handleDropdownOption = (
    event: React.MouseEvent,
    option: string,
    network: NetworkItem,
  ) => {
    event.stopPropagation()
    setOpenDropdownId(null)

    switch (option) {
      case 'cytoscape':
        // Open in Cytoscape Web
        router.push(`/cytoscape/web/${network.originalData.externalId}`)
        break
      case 'edit':
        // Edit network property
        router.push(`/network/edit/${network.originalData.externalId}`)
        break
      case 'doi':
        // Request DOI
        router.push(`/network/doi-request/${network.originalData.externalId}`)
        break
      default:
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null && !event.target) {
        return
      }

      // Check if the click was inside a dropdown menu button
      const isClickInsideDropdown = (event.target as Element)?.closest(
        '[data-dropdown-button]',
      )
      if (!isClickInsideDropdown) {
        setOpenDropdownId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  // Display a user-friendly error message
  const renderErrorMessage = (errorMsg: string) => {
    // Check for specific error types
    if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
      return (
        <div className="flex flex-col items-center justify-center">
          <p className="text-red-500 mb-2">Authentication error</p>
          <p className="text-gray-700 text-sm mb-4">
            Your session may have expired
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => {
              // Relogin
              if (isAuthenticated) {
                router.push('/')
              }
            }}
          >
            Sign in again
          </button>
        </div>
      )
    }

    return <p className="text-red-500">Error loading networks: {errorMsg}</p>
  }

  // Helper to determine file icon
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <Folder className="h-5 w-5 text-gray-600" />
      case 'network':
        return <File className="h-5 w-5 text-blue-600" />
      case 'doc':
        return <File className="h-5 w-5 text-blue-600" />
      case 'spreadsheet':
        return <File className="h-5 w-5 text-green-600" />
      case 'code':
        return <File className="h-5 w-5 text-yellow-600" />
      default:
        return <File className="h-5 w-5 text-gray-600" />
    }
  }

  if (isInitializing || !isAuthenticated || !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {renderErrorMessage(error.message)}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <SideBar
        storageUsed={2}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">My Drive</h1>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-full overflow-hidden border border-gray-200">
              <button
                className={`flex items-center justify-center p-2 w-10 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
              <button
                className={`flex items-center justify-center p-2 w-10 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
            </div>
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="px-6 py-2 border-b border-gray-200 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm">
            <span>Type</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm">
            <span>People</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm">
            <span>Modified</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 text-sm">
            <span>Source</span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 ml-auto flex items-center justify-end">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search in My Drive"
                className="pl-9 pr-4 py-1.5 rounded-md border border-gray-300 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Folders Section */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>

            {/* Grid/List View Toggle */}
            <div
              className={
                viewMode === 'grid' ? 'grid grid-cols-4 gap-4' : 'space-y-1'
              }
            >
              {FOLDERS_DATA.map((folder, index) => (
                <div
                  key={folder.id}
                  className={`
                    rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer overflow-hidden
                    ${selectedItems.includes(folder.id) ? 'bg-blue-100' : ''}
                    ${
                      viewMode === 'grid'
                        ? 'p-3'
                        : 'p-2 flex items-center justify-between'
                    }
                  `}
                  onClick={(e) => handleItemSelect(e, folder.id, index)}
                >
                  {viewMode === 'grid' ? (
                    <div>
                      <div className="flex items-center justify-center h-24 w-full bg-gray-100 rounded mb-2">
                        <Folder className="h-12 w-12 text-gray-500" />
                      </div>
                      <p className="text-sm font-medium truncate">
                        {folder.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Modified {folder.modified}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Folder className="h-5 w-5 text-gray-500" />
                        <span className="text-sm">{folder.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                          Modified {folder.modified}
                        </span>
                        <button className="p-1 rounded-full hover:bg-gray-200">
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Files Section */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Networks</h2>

            {/* Grid/List View Toggle */}
            <div
              className={
                viewMode === 'grid' ? 'grid grid-cols-4 gap-4' : 'space-y-1'
              }
            >
              {NETWORK_DATA.map((network, index) => (
                <div
                  key={network.id}
                  className={`
                    rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer overflow-hidden
                    ${
                      selectedItems.includes(network.id)
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : ''
                    }
                    ${
                      viewMode === 'grid'
                        ? 'p-3'
                        : 'p-2 flex items-center justify-between'
                    }
                  `}
                  onClick={(e) =>
                    handleItemSelect(e, network.id, index + FOLDERS_DATA.length)
                  }
                >
                  {viewMode === 'grid' ? (
                    <div className="relative">
                      <div className="flex items-center justify-center h-24 w-full bg-gray-100 rounded mb-2">
                        {getItemIcon(network.type)}
                      </div>
                      <div className="flex justify-between items-start mb-1">
                        <p
                          className="text-sm font-medium truncate text-blue-600 hover:underline mr-2"
                          onClick={(e) =>
                            handleNetworkClick(
                              network.originalData.externalId,
                              e,
                            )
                          }
                        >
                          {network.name}
                        </p>
                        <div className="relative">
                          <button
                            className="p-1 rounded-full hover:bg-gray-200"
                            onClick={(e) => handleDropdownToggle(e, network.id)}
                            data-dropdown-button
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdownId === network.id && (
                            <div className="absolute right-0 z-50 mt-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(
                                      e,
                                      'cytoscape',
                                      network,
                                    )
                                  }
                                >
                                  Open in Cytoscape Web
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(e, 'edit', network)
                                  }
                                >
                                  Edit network property
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(e, 'doi', network)
                                  }
                                >
                                  Request DOI
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Modified {network.modified}
                      </p>
                      <p className="text-xs text-gray-500">
                        Nodes:{' '}
                        {network.originalData.nodeCount?.toLocaleString() ||
                          'N/A'}{' '}
                        | Edges:{' '}
                        {network.originalData.edgeCount?.toLocaleString() ||
                          'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            network.originalData.visibility === 'PUBLIC'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {network.originalData.visibility}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        {getItemIcon(network.type)}
                        <div>
                          <span
                            className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                            onClick={(e) =>
                              handleNetworkClick(
                                network.originalData.externalId,
                                e,
                              )
                            }
                          >
                            {network.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            Nodes:{' '}
                            {network.originalData.nodeCount?.toLocaleString() ||
                              'N/A'}{' '}
                            | Edges:{' '}
                            {network.originalData.edgeCount?.toLocaleString() ||
                              'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                          Modified {network.modified}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            network.originalData.visibility === 'PUBLIC'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {network.originalData.visibility}
                        </span>
                        <div className="relative">
                          <button
                            className="p-1 rounded-full hover:bg-gray-200"
                            onClick={(e) => handleDropdownToggle(e, network.id)}
                            data-dropdown-button
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {/* Dropdown Menu */}
                          {openDropdownId === network.id && (
                            <div className="absolute right-0 z-50 mt-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(
                                      e,
                                      'cytoscape',
                                      network,
                                    )
                                  }
                                >
                                  Open in Cytoscape Web
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(e, 'edit', network)
                                  }
                                >
                                  Edit network property
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  onClick={(e) =>
                                    handleDropdownOption(e, 'doi', network)
                                  }
                                >
                                  Request DOI
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {detailsOpen && (
        <div className="w-80 h-screen border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium">Details</h3>
            <button
              className="p-1 rounded-full hover:bg-gray-100"
              onClick={() => setDetailsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedItems.length === 1 && (
            <div className="p-4">
              <div className="flex items-center justify-center h-40 w-full bg-gray-100 rounded mb-4">
                {getItemIcon(
                  ALL_ITEMS.find((item) => item.id === selectedItems[0])
                    ?.type || 'file',
                )}
              </div>

              <h4 className="text-lg font-medium mb-1">
                {ALL_ITEMS.find((item) => item.id === selectedItems[0])?.name}
              </h4>

              <p className="text-sm text-gray-500 mb-6">
                Type:{' '}
                {ALL_ITEMS.find((item) => item.id === selectedItems[0])?.type}
              </p>

              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Details
                  </h5>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Modified</span>
                      <span>
                        {
                          ALL_ITEMS.find((item) => item.id === selectedItems[0])
                            ?.modified
                        }
                      </span>
                    </div>

                    {/* Show network-specific details if the selected item is a network */}
                    {(() => {
                      const selectedItem = ALL_ITEMS.find(
                        (item) => item.id === selectedItems[0],
                      )
                      if (selectedItem?.type === 'network') {
                        const networkItem = selectedItem as NetworkItem
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Owner</span>
                              <span>{networkItem.originalData.owner}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nodes</span>
                              <span>
                                {networkItem.originalData.nodeCount?.toLocaleString() ||
                                  'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Edges</span>
                              <span>
                                {networkItem.originalData.edgeCount?.toLocaleString() ||
                                  'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Visibility</span>
                              <span>{networkItem.originalData.visibility}</span>
                            </div>
                          </>
                        )
                      } else {
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Created</span>
                              <span>2023-01-01</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Size</span>
                              <span>4.5 MB</span>
                            </div>
                          </>
                        )
                      }
                    })()}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-1">
                    Description
                  </h5>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const selectedItem = ALL_ITEMS.find(
                        (item) => item.id === selectedItems[0],
                      )
                      if (selectedItem?.type === 'network') {
                        const networkItem = selectedItem as NetworkItem
                        return (
                          networkItem.originalData.description ||
                          'No description available.'
                        )
                      }
                      return 'Select an item to view or add a description.'
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedItems.length > 1 && (
            <div className="p-4">
              <p className="text-lg font-medium mb-4">
                {selectedItems.length} items selected
              </p>
              <ul className="space-y-2 text-sm">
                {selectedItems.map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    {getItemIcon(
                      ALL_ITEMS.find((item) => item.id === id)?.type || 'file',
                    )}
                    <span>
                      {ALL_ITEMS.find((item) => item.id === id)?.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
