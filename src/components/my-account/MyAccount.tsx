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
  Trash2,
  Download,
  FolderUp,
  Share2,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { useUserNetwork } from '@/hooks/use-user-network'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { NetworkSummary } from '@/types/api/ndex/NetworkSummary'
import DetailsPanel from './DetailsPanel'

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
  // Add state for system properties dropdown
  const [systemPropertiesOpen, setSystemPropertiesOpen] = useState(false)
  // Add state to track if selection toolbar is visible
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(true)

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

  // Handle network click
  const handleNetworkClick = (networkId: string, event: React.MouseEvent) => {
    // Prevent triggering the item select handler
    event.stopPropagation()

    // Navigate to the network view page
    router.push(`/network/${networkId}`)
  }

  // Add double-click handler to open network in a new tab with the NDEx viewer URL
  const handleNetworkDoubleClick = (
    networkId: string,
    event: React.MouseEvent,
  ) => {
    // Prevent default behavior and propagation
    event.preventDefault()
    event.stopPropagation()

    // Open the network in a new tab using the NDEx viewer URL
    window.open(
      `https://${config.ndexBaseUrl}/viewer/networks/${networkId}`,
      '_blank',
    )
  }

  // Handle selection with modifiers
  const handleItemSelect = (
    event: React.MouseEvent,
    id: number,
    index: number,
  ) => {
    // Prevent default browser behavior (like text selection)
    event.preventDefault()

    // If clicking an already selected item and the toolbar is hidden, show it
    if (
      selectedItems.includes(id) &&
      !showSelectionToolbar &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      setShowSelectionToolbar(true)
      return
    }

    // Always show the toolbar when selecting items
    setShowSelectionToolbar(true)

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

  // Handle close button in the selection toolbar (just hide the toolbar)
  const handleCloseToolbar = (event: React.MouseEvent) => {
    event.stopPropagation()
    setShowSelectionToolbar(false)
  }

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
        return <File className="h-5 w-5 text-sky-700" />
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

  // Add function to handle clicks outside of items to deselect them
  const handleOutsideClick = (event: React.MouseEvent) => {
    // Check if the click target is a part of any item
    const isClickOutside =
      (event.target as Element)?.closest('[data-item]') === null

    // Only deselect if click is outside of items and not on dropdown or other UI controls
    if (
      isClickOutside &&
      !(event.target as Element)?.closest('[data-dropdown-button]') &&
      !(event.target as Element)?.closest('[data-action-button]') &&
      !(event.target as Element)?.closest('[data-properties-dropdown]')
    ) {
      setSelectedItems([])
      setShowSelectionToolbar(true)
      // Also close the system properties dropdown
      setSystemPropertiesOpen(false)
    }
  }

  // Effect to close system properties dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        systemPropertiesOpen &&
        !(event.target as Element)?.closest('[data-properties-dropdown]')
      ) {
        setSystemPropertiesOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [systemPropertiesOpen])

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
    <div className="flex h-screen gap-x-4 p-2">
      {/* Sidebar */}
      <SideBar
        storageUsed={2}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border border-gray-200 rounded-md">
        {/* Header */}
        <header className="px-6 py-3 flex items-center justify-between shrink-0">
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
                    ? 'bg-sky-50 text-sky-700'
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
                    ? 'bg-sky-50 text-sky-700'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
            </div>
            <button
              className={`p-3 rounded-full ${
                detailsOpen ? 'bg-sky-50 text-sky-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Selection Toolbar or Filters */}
        <div className="mt-1 mb-3 mx-4">
          {selectedItems.length > 0 && showSelectionToolbar ? (
            <div className="px-6 py-2 flex items-center justify-between bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200"
                  onClick={handleCloseToolbar}
                  title="Hide toolbar"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.length}{' '}
                  {selectedItems.length === 1 ? 'item' : 'items'} selected
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200"
                  title="Delete"
                  data-action-button
                >
                  <Trash2 className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200"
                  title="Download"
                  data-action-button
                >
                  <Download className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200"
                  title="Move"
                  data-action-button
                >
                  <FolderUp className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  className="p-1.5 rounded-full hover:bg-gray-200"
                  title="Share"
                  data-action-button
                >
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
                <div className="relative">
                  <button
                    className="p-1.5 rounded-full hover:bg-gray-200"
                    title="Set system properties"
                    data-action-button
                    onClick={() =>
                      setSystemPropertiesOpen(!systemPropertiesOpen)
                    }
                    data-properties-dropdown
                  >
                    <Settings className="h-5 w-5 text-gray-600" />
                  </button>

                  {/* System properties dropdown */}
                  {systemPropertiesOpen && (
                    <div
                      className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-gray-300 ring-opacity-5 focus:outline-none"
                      data-properties-dropdown
                    >
                      <div className="py-1">
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          data-properties-dropdown
                        >
                          Set Read Only
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          data-properties-dropdown
                        >
                          Change Visibility
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-2 flex flex-wrap gap-2">
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
          )}
        </div>

        {/* Main Content Section - add onclick handler to deselect items when clicking outside */}
        <div
          className="flex-1 overflow-y-auto p-6"
          onClick={handleOutsideClick}
        >
          {/* Folders Section */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>

            {/* Grid/List View Toggle - Container decides layout */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4'
                  : 'space-y-1'
              }
            >
              {FOLDERS_DATA.map((folder, index) => (
                <div
                  key={folder.id}
                  data-item
                  className={`
                    rounded-md border border-gray-200 cursor-pointer select-none
                    p-2 flex items-center justify-between /* Always use list-like padding & flex */
                    ${
                      selectedItems.includes(folder.id)
                        ? 'bg-blue-100'
                        : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={(e) => handleItemSelect(e, folder.id, index)}
                >
                  {/* Consistent item layout for both views */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Wrap icon to prevent shrinking */}
                    <div className="flex-shrink-0">
                      {getItemIcon(folder.type)}
                    </div>
                    <span className="text-sm truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Show Modified date only in list view for folders */}
                    {viewMode === 'list' && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        Modified {folder.modified}
                      </span>
                    )}
                    <button className="p-1 rounded-full hover:bg-gray-200">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Files Section */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Networks</h2>

            {/* Grid/List View Toggle - Container decides layout */}
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4'
                  : 'space-y-1'
              }
            >
              {NETWORK_DATA.map((network, index) => (
                <div
                  key={network.id}
                  data-item
                  className={`
                    rounded-md border border-gray-200 cursor-pointer select-none
                    p-2 flex items-center justify-between /* Always use list-like padding & flex */
                    ${
                      selectedItems.includes(network.id)
                        ? 'bg-sky-100'
                        : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={(e) =>
                    handleItemSelect(e, network.id, index + FOLDERS_DATA.length)
                  }
                  onDoubleClick={(e) =>
                    handleNetworkDoubleClick(network.originalData.externalId, e)
                  }
                >
                  {/* Consistent item layout for both views, with list-specific details */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Wrap icon to prevent shrinking */}
                    <div className="flex-shrink-0">
                      {getItemIcon(network.type)}
                    </div>
                    <div>
                      {' '}
                      {/* Wrapper for name and list-view details */}
                      <span className="text-sm text-black truncate">
                        {network.name}
                      </span>
                      {/* Show Node/Edge counts only in list view */}
                      {viewMode === 'list' && (
                        <div className="text-xs text-gray-500">
                          Nodes:{' '}
                          {network.originalData.nodeCount?.toLocaleString() ||
                            'N/A'}{' '}
                          | Edges:{' '}
                          {network.originalData.edgeCount?.toLocaleString() ||
                            'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Show Modified date and Visibility only in list view */}
                    {viewMode === 'list' && (
                      <>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Modified {network.modified}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            network.originalData.visibility === 'PUBLIC'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {network.originalData.visibility}
                        </span>
                      </>
                    )}
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
                        <div className="absolute right-0 z-50 mt-1 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-gray-300 ring-opacity-5 focus:outline-none overflow-hidden">
                          {/* Dropdown content... */}
                          <div className="py-1">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={(e) =>
                                handleDropdownOption(e, 'cytoscape', network)
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel is now a SIBLING to the main content div */}
      <DetailsPanel
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        selectedItems={selectedItems}
        allItems={ALL_ITEMS}
      />
    </div>
  )
}
