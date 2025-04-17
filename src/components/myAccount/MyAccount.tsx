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
  SlidersHorizontal,
  Check,
  Calendar,
  RefreshCw,
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
  isTrash?: boolean // Whether this is the trash view
}

// Update the DetailsPanel to work with our new data structure
interface DetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: string[]
  allItems: FolderItemBase[]
}

// Define filter type
type FilterOptionType = 'edgeCount' | 'nodeCount' | 'modificationTime'
type FilterStateType = 'choose' | null

export default function MyAccount({ uuid, isTrash = false }: MyAccountProps) {
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
  const [activeFilter, setActiveFilter] = useState<FilterStateType>(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] =
    useState<FilterOptionType | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<Set<FilterOptionType>>(
    new Set(),
  )
  const [filterValues, setFilterValues] = useState<{
    edgeCount: { min: string; max: string }
    nodeCount: { min: string; max: string }
    modificationTime: { start: string; end: string }
  }>({
    edgeCount: { min: '', max: '' },
    nodeCount: { min: '', max: '' },
    modificationTime: { start: '', end: '' },
  })
  const [trashItems, setTrashItems] = useState<FolderItemBase[]>([])

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
      router.push('/myAccount')
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

  // Filter labels
  const filterLabels: Record<FilterOptionType, string> = {
    edgeCount: 'Edge Count',
    nodeCount: 'Node Count',
    modificationTime: 'Modification Time',
  }

  // Handle filter selection toggle
  const toggleFilter = (type: FilterOptionType) => {
    const newSelectedFilters = new Set(selectedFilters)
    if (newSelectedFilters.has(type)) {
      newSelectedFilters.delete(type)
    } else {
      newSelectedFilters.add(type)
    }
    setSelectedFilters(newSelectedFilters)
  }

  // Handle filter value change
  const handleFilterValueChange = (
    type: FilterOptionType,
    field: string,
    value: string,
  ) => {
    setFilterValues({
      ...filterValues,
      [type]: {
        ...filterValues[type],
        [field]: value,
      },
    })
  }

  // Format filter display value
  const getFilterDisplayValue = (type: FilterOptionType) => {
    switch (type) {
      case 'edgeCount':
        const { min: eMin, max: eMax } = filterValues.edgeCount
        return `${eMin || '0'}-${eMax || '∞'}`
      case 'nodeCount':
        const { min: nMin, max: nMax } = filterValues.nodeCount
        return `${nMin || '0'}-${nMax || '∞'}`
      case 'modificationTime':
        const { start, end } = filterValues.modificationTime
        if (!start && !end) return 'Any time'
        if (start && !end) return `After ${start}`
        if (!start && end) return `Before ${end}`
        return `${start} - ${end}`
    }
  }

  // Filter dropdown reference for outside click handling
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownOpen &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setFilterDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [filterDropdownOpen])

  // Handle opening filter dropdown for editing
  const openFilterDropdown = (
    event: React.MouseEvent,
    type: FilterOptionType,
  ) => {
    event.stopPropagation()
    setActiveFilterDropdown(activeFilterDropdown === type ? null : type)
  }

  // Close all filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('[data-filter-dropdown]')) {
        setActiveFilterDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch trash contents when in trash view
  useEffect(() => {
    const fetchTrashItems = async () => {
      if (isTrash && isAuthenticated && token) {
        try {
          setLoading(true)
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          const trashResults = await ndexClient.getTrash()
          setTrashItems(trashResults)
          // Set breadcrumb for trash
          setBreadcrumbPath([{ name: 'Trash', id: null }])
          setLoading(false)
        } catch (error) {
          console.error('Error fetching trash items:', error)
          setErrorMessage('Failed to load trash items')
          setLoading(false)
        }
      }
    }

    if (isTrash) {
      fetchTrashItems()
    }
  }, [isTrash, isAuthenticated, token, config.ndexBaseUrl])

  // Handle trash-specific actions
  const handleRestoreFromTrash = async (ids: string[]) => {
    if (isTrash && ids.length > 0 && isAuthenticated && token) {
      try {
        setLoading(true)
        const ndexClient = getNdexClient(config.ndexBaseUrl, token)

        // Restore each item
        for (const id of ids) {
          await ndexClient.restoreFromTrash(id)
        }

        // Refresh the trash items
        const trashResults = await ndexClient.getTrash()
        setTrashItems(trashResults)
        setSelectedItems([])
        setLoading(false)
      } catch (error) {
        console.error('Error restoring items from trash:', error)
        setErrorMessage('Failed to restore items from trash')
        setLoading(false)
      }
    }
  }

  const handlePermanentDelete = async (ids: string[]) => {
    if (isTrash && ids.length > 0 && isAuthenticated && token) {
      try {
        setLoading(true)
        const ndexClient = getNdexClient(config.ndexBaseUrl, token)

        // Permanently delete each item
        for (const id of ids) {
          await ndexClient.permanentlyDeleteFromTrash(id)
        }

        // Refresh the trash items
        const trashResults = await ndexClient.getTrash()
        setTrashItems(trashResults)
        setSelectedItems([])
        setLoading(false)
      } catch (error) {
        console.error('Error permanently deleting items:', error)
        setErrorMessage('Failed to permanently delete items')
        setLoading(false)
      }
    }
  }

  // Determine which items to display based on whether we're in trash view or normal view
  const displayItems = isTrash ? trashItems : folderContents

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
        activeView={isTrash ? 'trash' : 'myAccount'}
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
                    onClick={() =>
                      isTrash
                        ? router.push('/trash')
                        : handleBreadcrumbClick(crumb.id)
                    }
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
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
                {isTrash ? (
                  // Trash-specific actions
                  <>
                    <button
                      className="p-1.5 rounded-full hover:bg-gray-200"
                      title="Restore from trash"
                      data-action-button
                      onClick={() => handleRestoreFromTrash(selectedItems)}
                    >
                      <FolderUp className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                      className="p-1.5 rounded-full hover:bg-gray-200"
                      title="Permanently delete"
                      data-action-button
                      onClick={() => handlePermanentDelete(selectedItems)}
                    >
                      <Trash2 className="h-5 w-5 text-gray-600" />
                    </button>
                  </>
                ) : (
                  // Regular actions
                  <>
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
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-2 flex flex-wrap gap-2">
              {!isTrash && (
                <div className="relative" ref={filterDropdownRef}>
                  {/* Main filter button styled like the image */}
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-300 text-sky-700 hover:bg-gray-50"
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    <span className="font-medium">All filters</span>
                  </button>

                  {/* Filter dropdown with checkboxes */}
                  {filterDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-72 rounded-md bg-white border border-gray-200 shadow-sm z-10 p-5">
                      <h3 className="text-base font-medium text-gray-900 mb-4">
                        Filters
                      </h3>
                      <div className="space-y-5">
                        {/* Edge Count Filter */}
                        <div>
                          <div className="flex items-center mb-2">
                            <div
                              className={`h-5 w-5 flex items-center justify-center border ${
                                selectedFilters.has('edgeCount')
                                  ? 'bg-sky-700 border-sky-700'
                                  : 'border-gray-400'
                              } rounded cursor-pointer`}
                              onClick={() => toggleFilter('edgeCount')}
                            >
                              {selectedFilters.has('edgeCount') && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <label
                              className="ml-2 text-base font-medium text-gray-700 cursor-pointer"
                              onClick={() => toggleFilter('edgeCount')}
                            >
                              Edge Count
                            </label>
                          </div>
                          {selectedFilters.has('edgeCount') && (
                            <div className="flex items-center gap-2 pl-7 mt-3">
                              <input
                                type="number"
                                placeholder="Min"
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                min="0"
                                value={filterValues.edgeCount.min}
                                onChange={(e) =>
                                  handleFilterValueChange(
                                    'edgeCount',
                                    'min',
                                    e.target.value,
                                  )
                                }
                              />
                              <span>-</span>
                              <input
                                type="number"
                                placeholder="Max"
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                min="0"
                                value={filterValues.edgeCount.max}
                                onChange={(e) =>
                                  handleFilterValueChange(
                                    'edgeCount',
                                    'max',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>

                        {/* Node Count Filter */}
                        <div>
                          <div className="flex items-center mb-2">
                            <div
                              className={`h-5 w-5 flex items-center justify-center border ${
                                selectedFilters.has('nodeCount')
                                  ? 'bg-sky-700 border-sky-700'
                                  : 'border-gray-400'
                              } rounded cursor-pointer`}
                              onClick={() => toggleFilter('nodeCount')}
                            >
                              {selectedFilters.has('nodeCount') && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <label
                              className="ml-2 text-base font-medium text-gray-700 cursor-pointer"
                              onClick={() => toggleFilter('nodeCount')}
                            >
                              Node Count
                            </label>
                          </div>
                          {selectedFilters.has('nodeCount') && (
                            <div className="flex items-center gap-2 pl-7 mt-3">
                              <input
                                type="number"
                                placeholder="Min"
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                min="0"
                                value={filterValues.nodeCount.min}
                                onChange={(e) =>
                                  handleFilterValueChange(
                                    'nodeCount',
                                    'min',
                                    e.target.value,
                                  )
                                }
                              />
                              <span>-</span>
                              <input
                                type="number"
                                placeholder="Max"
                                className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                min="0"
                                value={filterValues.nodeCount.max}
                                onChange={(e) =>
                                  handleFilterValueChange(
                                    'nodeCount',
                                    'max',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>

                        {/* Modification Time Filter */}
                        <div>
                          <div className="flex items-center mb-2">
                            <div
                              className={`h-5 w-5 flex items-center justify-center border ${
                                selectedFilters.has('modificationTime')
                                  ? 'bg-sky-700 border-sky-700'
                                  : 'border-gray-400'
                              } rounded cursor-pointer`}
                              onClick={() => toggleFilter('modificationTime')}
                            >
                              {selectedFilters.has('modificationTime') && (
                                <Check className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <label
                              className="ml-2 text-base font-medium text-gray-700 cursor-pointer"
                              onClick={() => toggleFilter('modificationTime')}
                            >
                              Modification Time
                            </label>
                          </div>
                          {selectedFilters.has('modificationTime') && (
                            <div className="flex flex-col gap-3 pl-7 mt-3">
                              <div className="flex items-center">
                                <label className="text-sm text-gray-600 w-16">
                                  From:
                                </label>
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="MM/DD/YYYY"
                                    className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded text-sm"
                                    value={filterValues.modificationTime.start}
                                    onChange={(e) =>
                                      handleFilterValueChange(
                                        'modificationTime',
                                        'start',
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <Calendar className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                              </div>
                              <div className="flex items-center">
                                <label className="text-sm text-gray-600 w-16">
                                  To:
                                </label>
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="MM/DD/YYYY"
                                    className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded text-sm"
                                    value={filterValues.modificationTime.end}
                                    onChange={(e) =>
                                      handleFilterValueChange(
                                        'modificationTime',
                                        'end',
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <Calendar className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Display active filters as tags - only show in non-trash view */}
              {!isTrash &&
                Array.from(selectedFilters).map((filterType) => (
                  <div key={filterType} className="relative">
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-md bg-sky-50 border border-gray-300 text-sm cursor-pointer"
                      onClick={(e) => openFilterDropdown(e, filterType)}
                      data-filter-dropdown
                    >
                      <span className="font-medium">
                        {filterLabels[filterType]}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                      <button
                        className="text-gray-500 hover:text-gray-700 ml-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFilter(filterType)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Filter value editing dropdown */}
                    {activeFilterDropdown === filterType && (
                      <div
                        className="absolute top-full left-0 mt-1 w-72 rounded-md bg-white border border-gray-200 shadow-sm z-10 p-4"
                        data-filter-dropdown
                      >
                        <h3 className="text-base font-medium text-gray-900 mb-3">
                          {filterLabels[filterType]} Settings
                        </h3>

                        {filterType === 'edgeCount' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Min"
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              min="0"
                              value={filterValues.edgeCount.min}
                              onChange={(e) =>
                                handleFilterValueChange(
                                  'edgeCount',
                                  'min',
                                  e.target.value,
                                )
                              }
                            />
                            <span>-</span>
                            <input
                              type="number"
                              placeholder="Max"
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              min="0"
                              value={filterValues.edgeCount.max}
                              onChange={(e) =>
                                handleFilterValueChange(
                                  'edgeCount',
                                  'max',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        )}

                        {filterType === 'nodeCount' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Min"
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              min="0"
                              value={filterValues.nodeCount.min}
                              onChange={(e) =>
                                handleFilterValueChange(
                                  'nodeCount',
                                  'min',
                                  e.target.value,
                                )
                              }
                            />
                            <span>-</span>
                            <input
                              type="number"
                              placeholder="Max"
                              className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm"
                              min="0"
                              value={filterValues.nodeCount.max}
                              onChange={(e) =>
                                handleFilterValueChange(
                                  'nodeCount',
                                  'max',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        )}

                        {filterType === 'modificationTime' && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center">
                              <label className="text-sm text-gray-600 w-16">
                                From:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder="MM/DD/YYYY"
                                  className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded text-sm"
                                  value={filterValues.modificationTime.start}
                                  onChange={(e) =>
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'start',
                                      e.target.value,
                                    )
                                  }
                                />
                                <Calendar className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>
                            <div className="flex items-center">
                              <label className="text-sm text-gray-600 w-16">
                                To:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder="MM/DD/YYYY"
                                  className="w-full pl-3 pr-9 py-1.5 border border-gray-300 rounded text-sm"
                                  value={filterValues.modificationTime.end}
                                  onChange={(e) =>
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'end',
                                      e.target.value,
                                    )
                                  }
                                />
                                <Calendar className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end mt-4">
                          <button
                            className="px-3 py-1.5 bg-sky-700 text-white text-sm rounded hover:bg-sky-600"
                            onClick={() => setActiveFilterDropdown(null)}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {/* Show trash info message when in trash view */}
              {isTrash && (
                <div className="ml-auto text-sm text-gray-600">
                  Items in trash will be permanently deleted after 30 days
                </div>
              )}
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
            folders={displayItems}
            viewMode={viewMode}
            selectedItems={selectedItems}
            onSelect={handleItemSelect}
            currentFolderId={folderId}
          />

          {/* Networks list */}
          <NetworksList
            items={displayItems}
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
        allItems={displayItems}
      />
    </div>
  )
}
