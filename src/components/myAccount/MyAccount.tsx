'use client'

import React, { useState, useEffect, useRef } from 'react'
import SideBar from './SideBar'
import FoldersList from './FoldersList'
import NetworksList from './NetworksList'
import {
  Grid,
  List,
  Info,
  X,
  Folder,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Trash2,
  Download,
  FolderUp,
  Share2,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { useConfig } from '@/lib/contexts/ConfigContext'
import DetailsPanel from './DetailsPanel'
import { useFolderContents, FolderItemBase } from '@/hooks/use-folder-contents'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

// Define the props for MyAccount component
interface MyAccountProps {
  uuid?: string // The folder UUID, if null we're in the home folder
}

// Update the DetailsPanel to work with our new data structure
interface DetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: string[]
  allItems: FolderItemBase[]
}

export default function MyAccount({ uuid }: MyAccountProps) {
  const config = useConfig()
  const { isAuthenticated, token, tokenParsed, isInitializing } = useAuth()
  const router = useRouter()

  // Convert UUID string to null for home folder
  const folderId = uuid || null

  // State for UI controls
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  )
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [systemPropertiesOpen, setSystemPropertiesOpen] = useState(false)
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(true)
  const [currentFolderInfo, setCurrentFolderInfo] = useState<any>(null)
  const [breadcrumbPath, setBreadcrumbPath] = useState<
    { name: string; id: string | null }[]
  >([])

  // Reference to detect clicks outside the dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch folder contents using the hook
  const {
    items: folderContents,
    isLoading,
    error,
    isEmpty,
  } = useFolderContents(folderId)

  // Fetch current folder info if we're in a subfolder
  useEffect(() => {
    const fetchFolderInfo = async () => {
      if (folderId) {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          const folderInfo = await ndexClient.getFolder(folderId)
          setCurrentFolderInfo(folderInfo)

          // After setting current folder info, build the breadcrumb path
          if (folderInfo) {
            buildBreadcrumbPath(folderInfo)
          }
        } catch (error) {
          console.error('Error fetching folder info:', error)
          setErrorMessage('Failed to load folder information')
        }
      } else {
        setCurrentFolderInfo(null)
        // Reset breadcrumb path to just "My Drive" for home folder
        setBreadcrumbPath([{ name: 'My Drive', id: null }])
      }
    }

    if (isAuthenticated && token && folderId !== undefined) {
      fetchFolderInfo()
    }
  }, [folderId, isAuthenticated, token, config.ndexBaseUrl])

  // Build complete breadcrumb path by recursively fetching parent folders
  const buildBreadcrumbPath = async (currentFolder: {
    name: string
    parent: string | null
    externalId?: string
    uuid?: string
  }) => {
    try {
      // Define the type explicitly to match state type
      type BreadcrumbItem = { name: string; id: string | null }

      // Start with current folder
      const path: BreadcrumbItem[] = [
        {
          name: currentFolder.name,
          id: currentFolder.externalId || currentFolder.uuid || folderId,
        },
      ]

      // Recursively fetch parent folders
      let parentId = currentFolder.parent
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)

      while (parentId) {
        const parentFolder = await ndexClient.getFolder(parentId)
        // Add parent to the beginning of the path
        path.unshift({
          name: parentFolder.name,
          id: parentFolder.externalId || parentFolder.uuid || parentId,
        })
        parentId = parentFolder.parent
      }

      // Add "My Drive" as the first item
      path.unshift({ name: 'My Drive', id: null })

      // Update the breadcrumb path
      setBreadcrumbPath(path)
    } catch (error) {
      console.error('Error building breadcrumb path:', error)
      // Fallback to simple path on error
      setBreadcrumbPath([
        { name: 'My Drive', id: null },
        { name: currentFolder.name, id: folderId },
      ])
    }
  }

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

  // Navigate back to parent folder
  const navigateToParent = () => {
    if (currentFolderInfo?.parent) {
      router.push(`/folder/${currentFolderInfo.parent}`)
    } else {
      // If parent is null, go to home
      router.push('/my-account')
    }
  }

  // Handle clicking a breadcrumb
  const handleBreadcrumbClick = (id: string | null) => {
    if (id === null) {
      router.push('/myAccount')
    } else {
      router.push(`/folder/${id}`)
    }
  }

  // Handle selection with modifiers
  const handleItemSelect = (
    event: React.MouseEvent,
    id: string,
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
      // Create an array of all item IDs that can be selected
      const allItemIds = folderContents.map((item) => item.uuid)

      // Find the position of the current item and the last selected item
      const currentPosition = allItemIds.indexOf(id)
      const lastPosition = allItemIds.indexOf(
        folderContents[lastSelectedIndex].uuid,
      )

      if (currentPosition !== -1 && lastPosition !== -1) {
        // Determine the range boundaries
        const start = Math.min(currentPosition, lastPosition)
        const end = Math.max(currentPosition, lastPosition)

        // Get all items in the range
        const itemsInRange = allItemIds.slice(start, end + 1)

        // Combine existing selection with new range
        setSelectedItems([...new Set([...selectedItems, ...itemsInRange])])
      } else {
        // Fallback to selecting just this item if something goes wrong
        setSelectedItems([id])
      }
    }
    // Normal click for single selection
    else {
      setSelectedItems([id])
      setLastSelectedIndex(index)

      // Don't automatically open details panel on single click
      // Details can still be opened using the Info button in the header
    }
  }

  // Handle dropdown toggle
  const handleDropdownToggle = (event: React.MouseEvent, id: string) => {
    event.stopPropagation()
    setOpenDropdownId(openDropdownId === id ? null : id)
  }

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

    return <p className="text-red-500">Error loading content: {errorMsg}</p>
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
        currentFolderId={folderId}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white border border-gray-200 rounded-md">
        {/* Header */}
        <header className="px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-1">
              {breadcrumbPath.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <button
                    className={`text-${
                      index === breadcrumbPath.length - 1
                        ? 'xl font-semibold'
                        : 'sm'
                    } hover:underline`}
                    onClick={() => handleBreadcrumbClick(crumb.id)}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Back button if in a folder */}
            {folderId && (
              <button
                className="ml-2 p-1 rounded-full hover:bg-gray-100"
                onClick={navigateToParent}
                title="Go back to parent folder"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
            )}
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
          {/* Folders list */}
          <FoldersList
            folders={folderContents}
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelect={handleItemSelect}
            currentFolderId={folderId}
          />

          {/* Networks list */}
          <NetworksList
            items={folderContents}
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelect={handleItemSelect}
            currentFolderId={folderId}
          />
        </div>
      </div>

      {/* Details Panel is now a SIBLING to the main content div */}
      <DetailsPanel
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        selectedItems={selectedItems}
        allItems={folderContents}
      />
    </div>
  )
}
