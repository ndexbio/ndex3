'use client'

import React, { useState, useEffect, useRef } from 'react'
import SideBar from './SideBar'
import {
  Grid,
  List,
  Info,
  ChevronRight,
  Trash2,
  Download,
  FolderInput,
  UserPlus,
  FileEdit,
  Copy,
  FileSymlink,
  ExternalLink,
  BookCopy,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { useConfig } from '@/lib/contexts/ConfigContext'
import DetailsPanel from './DetailsPanel'
import { useFolder, useFolderContents } from '@/hooks/use-folder'
import { FileItemBase } from '@/types/api/ndex/File'
import { useSharedFiles } from '@/hooks/use-shared-files'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useToast } from '@/lib/contexts/ToastContext'
import { MyAccountTabType, FilterOptionType } from '@/types/ui/myAccount'
import { FileType } from '@/types/api/ndex'
import SelectionToolbarAndFilters from './SelectionToolbarAndFilters'
import { useShortcut } from '@/hooks/use-shortcut'
import { FilterState } from './SelectionToolbarAndFilters' // Import the FilterState type
import FileRenderer from './FileRenderer'
import { useTrash } from '@/hooks/use-trash' // Import the useTrash hook
import { useNetworkOperation } from '@/hooks/use-network-operation'
import ActionDropdown from './ActionDropdown' // Import the new ActionDropdown component
import { DialogProvider } from '@/lib/contexts/DialogContext' // Import DialogProvider

// Define the props for MyAccount component
interface MyAccountProps {
  tabState?: MyAccountTabType
  uuid?: string // The folder UUID, if null we're in the home folder
}

function MyAccountContent({
  uuid,
  tabState = MyAccountTabType.MYNETWORKS,
}: MyAccountProps) {
  const config = useConfig()
  const { isAuthenticated, token, isInitializing } = useAuth()
  const router = useRouter()
  const { addToast } = useToast()

  // Add the useShortcut hook
  const { createShortcut, updateShortcut, deleteShortcut } = useShortcut()

  // Add the useFolder hook
  const { deleteFolder, updateFolder } = useFolder()

  const { moveNetworks, deleteNetwork, getNetworkDOI, copyNetwork } =
    useNetworkOperation()

  // Only initialize hooks that are needed based on the active tab
  const {
    items: trashItems,
    isLoading: isLoadingTrash,
    error: trashError,
    refresh: refreshTrash,
    emptyTrash,
    restoreItems: restoreTrashItems,
    permanentDelete,
  } = tabState === MyAccountTabType.TRASH
    ? useTrash()
    : {
        items: [],
        isLoading: false,
        error: null,
        refresh: async () => {},
        emptyTrash: async () => {},
        restoreItems: async () => {},
        permanentDelete: async () => {},
      }

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

  const [selectedFilters, setSelectedFilters] = useState<Set<FilterOptionType>>(
    new Set(),
  )
  const [filterValues, setFilterValues] = useState<FilterState>({
    edgeCount: { min: '', max: '' },
    nodeCount: { min: '', max: '' },
    modificationTime: { start: '', end: '' },
  })

  // Remove the trashItems state since we're now using the hook
  // const [trashItems, setTrashItems] = useState<FileItemBase[]>([])
  const [dropdownType, setDropdownType] = useState<FileType | null>(null)
  const [lastSelectedType, setLastSelectedType] = useState<
    'FOLDER' | 'NETWORK' | null
  >(null)

  // Reference to detect clicks outside the dropdown
  const dropdownRef = useRef<HTMLDivElement>(null)
  const actionDropdownRef = useRef<HTMLDivElement>(null)

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only proceed if a dropdown is open
      if (!openDropdownId) return

      const target = event.target as Element

      // Don't close if clicking inside any dropdown menu
      if (target.closest('[data-dropdown-menu="true"]')) {
        return
      }

      // Don't close if clicking on the trigger button
      if (target.closest(`[data-dropdown-id="${openDropdownId}"]`)) {
        return
      }

      // Close the dropdown if the click is outside
      setOpenDropdownId(null)
      setDropdownType(null)
    }

    // Add event listener to document for all mouse down events
    document.addEventListener('mousedown', handleClickOutside)

    // Clean up event listener when component unmounts or dropdown state changes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId]) // Re-attach listener when openDropdownId changes

  // Handler for filter changes from SelectionToolbarAndFilters
  const handleFiltersChange = (
    newSelectedFilters: Set<FilterOptionType>,
    newFilterValues: FilterState,
  ) => {
    // Update our local state to match what's in the component
    setSelectedFilters(newSelectedFilters)
    setFilterValues(newFilterValues)

    // No need to do anything else - applyFilters will use these values
  }

  // Function to apply filters to the items
  const applyFilters = (items: FileItemBase[]): FileItemBase[] => {
    // If no filters are selected, return all items
    if (selectedFilters.size === 0) {
      return items
    }

    return items.filter((item) => {
      // Check each filter
      for (const filterType of selectedFilters) {
        // Edge Count Filter - only apply to networks, not folders
        if (filterType === 'edgeCount' && item.type !== 'FOLDER') {
          const min = filterValues.edgeCount.min
            ? parseInt(filterValues.edgeCount.min)
            : null
          const max = filterValues.edgeCount.max
            ? parseInt(filterValues.edgeCount.max)
            : null

          // Get edge count - since this property might not exist on all items, safely access it
          const edgeCount = (item as any).attributes?.edges || 0

          // Check if item's edge count is outside the filter range
          if (min !== null && edgeCount < min) {
            return false
          }
          if (max !== null && edgeCount > max) {
            return false
          }
        }

        // Node Count Filter
        if (filterType === 'nodeCount' && item.type !== 'FOLDER') {
          const min = filterValues.nodeCount.min
            ? parseInt(filterValues.nodeCount.min)
            : null
          const max = filterValues.nodeCount.max
            ? parseInt(filterValues.nodeCount.max)
            : null

          // Get node count - since this property might not exist on all items, safely access it
          const nodeCount = (item as any).nodeCount || 0

          // Check if item's node count is outside the filter range
          if (min !== null && nodeCount < min) {
            return false
          }
          if (max !== null && nodeCount > max) {
            return false
          }
        }

        // Modification Time Filter
        if (filterType === 'modificationTime') {
          // For start date, set time to beginning of day (00:00:00)
          let startTimestamp: number | null = null
          if (filterValues.modificationTime.start) {
            const startDate = new Date(filterValues.modificationTime.start)
            // Check if date is valid
            if (!isNaN(startDate.getTime())) {
              startDate.setHours(0, 0, 0, 0)
              startTimestamp = startDate.getTime()
            }
          }

          // For end date, set time to end of day (23:59:59)
          let endTimestamp: number | null = null
          if (filterValues.modificationTime.end) {
            const endDate = new Date(filterValues.modificationTime.end)
            // Check if date is valid
            if (!isNaN(endDate.getTime())) {
              endDate.setHours(23, 59, 59, 999)
              endTimestamp = endDate.getTime()
            }
          }

          // Get item's modification time - use creationTime if modificationTime is not available
          // Use type assertion to safely access properties that might not be in the FileItemBase type
          const modTime = (item as any).modificationTime
          const createTime = (item as any).creationTime

          // Try to parse the item's timestamp
          let itemTimestamp: number | null = null

          if (modTime || createTime) {
            const itemDate = new Date(modTime || createTime)
            if (!isNaN(itemDate.getTime())) {
              itemTimestamp = itemDate.getTime()
            }
          }

          // If we can't determine the item's timestamp, skip this filter for this item
          if (itemTimestamp === null) {
            continue
          }

          // Check if item's modification time is outside the filter range
          if (startTimestamp !== null && itemTimestamp < startTimestamp) {
            return false
          }
          if (endTimestamp !== null && itemTimestamp > endTimestamp) {
            return false
          }
        }
      }

      // If the item passed all active filters, include it
      return true
    })
  }

  // Only fetch folder contents if we're in My Networks tab
  const {
    items: folderContents,
    isLoading,
    error,
    isEmpty,
    refresh: refreshFolderContents,
  } = tabState === MyAccountTabType.MYNETWORKS
    ? useFolderContents(folderId)
    : {
        items: [],
        isLoading: false,
        error: null,
        isEmpty: true,
        refresh: async () => {},
      }

  // Only fetch shared items if we're in Shared tab
  const {
    items: sharedFiles,
    isLoading: isLoadingShared,
    error: sharedError,
    isEmpty: isSharedEmpty,
    refresh: refreshSharedFiles,
  } = tabState === MyAccountTabType.SHARED
    ? useSharedFiles()
    : {
        items: [],
        isLoading: false,
        error: null,
        isEmpty: true,
        refresh: async () => {},
      }

  // Update the determination of which items to display based on the current view
  const displayItems =
    tabState === MyAccountTabType.SHARED
      ? sharedFiles
      : tabState === MyAccountTabType.TRASH
      ? trashItems
      : folderContents

  const currentLoading =
    tabState === MyAccountTabType.SHARED
      ? isLoadingShared
      : tabState === MyAccountTabType.TRASH
      ? isLoadingTrash
      : isLoading

  const currentError =
    tabState === MyAccountTabType.SHARED
      ? sharedError
      : tabState === MyAccountTabType.TRASH
      ? trashError
      : error

  const currentIsEmpty =
    tabState === MyAccountTabType.SHARED
      ? isSharedEmpty
      : tabState === MyAccountTabType.TRASH
      ? !trashItems || trashItems.length === 0
      : isEmpty

  // Apply filters to get filtered items
  const filteredItems = applyFilters(displayItems)

  // Add the useEffect for trash to set breadcrumb
  useEffect(() => {
    if (tabState === MyAccountTabType.TRASH) {
      // Set breadcrumb for trash
      setBreadcrumbPath([{ name: 'Trash', id: null }])
    }
  }, [tabState])

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
        // Reset breadcrumb path based on current view
        if (tabState === MyAccountTabType.SHARED) {
          setBreadcrumbPath([{ name: 'Shared with me', id: null }])
        } else if (tabState === MyAccountTabType.TRASH) {
          setBreadcrumbPath([{ name: 'Trash', id: null }])
        } else {
          setBreadcrumbPath([{ name: 'My Drive', id: null }])
        }
      }
    }

    if (isAuthenticated && token && folderId !== undefined) {
      fetchFolderInfo()
    } else if (tabState === MyAccountTabType.SHARED) {
      // For shared view without folder ID, set the breadcrumb
      setBreadcrumbPath([{ name: 'Shared with me', id: null }])
    } else if (tabState === MyAccountTabType.TRASH) {
      // For trash view without folder ID, set the breadcrumb
      setBreadcrumbPath([{ name: 'Trash', id: null }])
    }
  }, [folderId, isAuthenticated, token, config.ndexBaseUrl, tabState])

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

  // Redirect if not authenticated - optimized for better UX
  useEffect(() => {
    // Don't redirect while Keycloak is still initializing
    if (isInitializing) {
      return
    }

    // Don't redirect if we're actively loading data (indicates page is working)
    if (currentLoading) {
      return
    }

    // Only redirect if authentication has clearly failed and we're not loading
    if (!isAuthenticated || !token) {
      console.log('Authentication check failed, redirecting to home')
      router.push('/')
    }
  }, [isAuthenticated, token, router, isInitializing, currentLoading])

  // Handle clicking a breadcrumb
  const handleBreadcrumbClick = (id: string | null) => {
    if (tabState === MyAccountTabType.SHARED) {
      router.push('/shared-with-me')
    } else if (tabState === MyAccountTabType.TRASH) {
      router.push('/trash')
    } else if (id === null) {
      router.push('/my-account')
    } else {
      router.push(`/folders/${id}`)
    }
  }

  // Handle selection with modifiers
  const handleItemSelect = (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: 'FOLDER' | 'NETWORK',
    sortedItems: FileItemBase[] = [],
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
      setLastSelectedType(type)
    }
    // Shift key for range selection
    else if (
      event.shiftKey &&
      lastSelectedIndex !== null &&
      lastSelectedType === type
    ) {
      // Use the sorted items passed from the component if available,
      // otherwise fall back to filtered items
      const typeItems =
        sortedItems.length > 0
          ? sortedItems
          : filteredItems.filter((item) => item.type === type)

      // Create an array of all item IDs of this type
      const typeItemIds = typeItems.map((item) => item.uuid)

      // Find the current item's position in the type-specific list
      const currentTypeIndex =
        sortedItems.length > 0
          ? index // Use the index directly from the sorted array
          : typeItems.findIndex((item) => item.uuid === id)

      // For the last selected item, we need to find its position in the sorted array
      const lastSelectedItem =
        sortedItems.length > 0 && lastSelectedIndex < sortedItems.length
          ? sortedItems[lastSelectedIndex]
          : filteredItems.find(
              (item) => item.type === type && selectedItems.includes(item.uuid),
            )

      // If we can't find the last selected item, just select this item
      if (!lastSelectedItem) {
        setSelectedItems([id])
        setLastSelectedIndex(index)
        setLastSelectedType(type)
        return
      }

      // Find the index of the last selected item in the sorted list
      const lastSelectedTypeIndex =
        sortedItems.length > 0
          ? lastSelectedIndex // Use the index directly if we're working with sorted items
          : typeItems.findIndex((item) => item.uuid === lastSelectedItem.uuid)

      if (currentTypeIndex !== -1 && lastSelectedTypeIndex !== -1) {
        // Determine the range boundaries within the sorted list
        const start = Math.min(currentTypeIndex, lastSelectedTypeIndex)
        const end = Math.max(currentTypeIndex, lastSelectedTypeIndex)

        // Get all items in the range from the sorted list
        const itemsInRange = typeItemIds.slice(start, end + 1)

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
      setLastSelectedType(type)
    }
  }

  // Handle dropdown toggle for items (folders and networks)
  const handleDropdownToggle = (
    event: React.MouseEvent,
    id: string,
    type: FileType,
  ) => {
    event.preventDefault()
    if (openDropdownId === id && dropdownType === type) {
      setOpenDropdownId(null)
      setDropdownType(null)
    } else {
      setOpenDropdownId(id)
      setDropdownType(type)
    }
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
          <p className="text-destructive mb-2">Authentication error</p>
          <p className="text-muted-foreground text-sm mb-4">
            Your session may have expired
          </p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
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

    return <p className="text-destructive">Error loading content: {errorMsg}</p>
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

  // Modify handleRestoreFromTrash to use our hook
  const handleRestoreFromTrash = async (ids: string[]) => {
    if (
      tabState === MyAccountTabType.TRASH &&
      ids.length > 0 &&
      isAuthenticated
    ) {
      try {
        setLoading(true)

        // Group IDs by type
        const folderIds: string[] = []
        const networkIds: string[] = []
        const shortcutIds: string[] = []

        // Filter items by type and get their IDs
        ids.forEach((id) => {
          const item = trashItems.find((item) => item.uuid === id)
          if (item) {
            if (item.type === 'FOLDER') {
              folderIds.push(id)
            } else if (item.type === 'NETWORK') {
              networkIds.push(id)
            } else if (item.type === 'SHORTCUT') {
              shortcutIds.push(id)
            }
          }
        })

        // Use the hook's restoreItems function
        await restoreTrashItems(networkIds, folderIds, shortcutIds)

        setSelectedItems([])
        setLoading(false)

        // Show success toast
        addToast({
          title: 'Items restored',
          description: `${ids.length} item(s) restored from trash`,
          type: 'success',
        })
      } catch (error) {
        console.error('Error restoring items from trash:', error)
        setErrorMessage('Failed to restore items from trash')
        setLoading(false)

        // Show error toast
        addToast({
          title: 'Restore failed',
          description: 'Failed to restore items from trash',
          type: 'error',
        })
      }
    }
  }

  // Modify handlePermanentDelete to use emptyTrash for bulk operations
  const handlePermanentDelete = async (ids?: string[]) => {
    if (tabState === MyAccountTabType.TRASH && isAuthenticated) {
      setLoading(true)
      if (ids) {
        for (const id of ids) {
          try {
            await permanentDelete(id)
            addToast({
              title: 'Item deleted',
              description: 'Item deleted successfully',
              type: 'success',
            })
          } catch (error) {
            console.error('Error permanently deleting item:', error)
            setErrorMessage('Failed to permanently delete item')
            setLoading(false)
          }
        }
      } else {
        try {
          await emptyTrash()
          addToast({
            title: 'Trash emptied',
            description: 'Trash emptied successfully',
            type: 'success',
          })
        } catch (error) {
          console.error('Error emptying trash:', error)
          setErrorMessage('Failed to empty trash')
          setLoading(false)
        }
      }
    }
  }

  const handleDeleteItems = async (itemIds: string[]) => {
    if (tabState === MyAccountTabType.TRASH) {
      await handlePermanentDelete(itemIds)
    } else {
      const items = displayItems.filter((item) => itemIds.includes(item.uuid))
      setLoading(true)
      for (const item of items) {
        if (item.type === FileType.FOLDER) {
          await deleteFolder(item.uuid)
        } else if (item.type === FileType.SHORTCUT) {
          await deleteShortcut(item.uuid)
        } else if (item.type === FileType.NETWORK) {
          await deleteNetwork(item.uuid)
        }
      }

      if (tabState === MyAccountTabType.SHARED) {
        await refreshSharedFiles()
      } else {
        await refreshFolderContents()
      }
      setLoading(false)
    }
  }

  // Update the handleMoveItems function to refresh trash when needed
  const handleMoveItems = async (itemIds: string[], targetFolderId: string) => {
    try {
      // Skip if trying to move to the same folder
      if (targetFolderId === folderId) {
        return
      }

      // First check if any of the selected items is the target folder to prevent circular references
      if (itemIds.includes(targetFolderId)) {
        console.error('Cannot move a folder into itself')
        addToast({
          title: 'Move failed',
          description: 'Cannot move a folder into itself',
          type: 'error',
        })
        return
      }

      // Show loading state
      setLoading(true)

      // Get NdexClient
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)

      // Find the items to move
      const itemsToMove = displayItems.filter((item) =>
        itemIds.includes(item.uuid),
      )

      // Keep track of items moved
      const movedItems = {
        total: itemsToMove.length,
        successful: 0,
        failed: 0,
        names: [] as string[],
      }

      let networksToMove: string[] = []
      // Move each item to the target folder based on its type
      for (const item of itemsToMove) {
        try {
          if (item.type === 'FOLDER') {
            // Move folder
            await updateFolder(item.uuid, item.name, targetFolderId)
            movedItems.successful++
            movedItems.names.push(item.name)
          } else if (item.type === 'NETWORK') {
            // Move network
            // TODO: Implement the updateNetwork method in ndexClient
            networksToMove.push(item.uuid)
          } else if (item.type === 'SHORTCUT') {
            // Update shortcut parent
            await updateShortcut(
              item.uuid,
              item.name,
              targetFolderId,
              item.attributes.target as string,
            )
            movedItems.successful++
            movedItems.names.push(item.name)
          }
        } catch (error) {
          console.error(`Error moving item ${item.name}:`, error)
          movedItems.failed++
        }
      }
      if (networksToMove.length > 0) {
        try {
          await moveNetworks(networksToMove, targetFolderId)
        } catch (error) {
          console.error('Error moving networks:', error)
        }
      }

      // Clear selection after move
      setSelectedItems([])

      // Show success/error toast
      if (movedItems.successful > 0) {
        let description = ''
        if (movedItems.names.length <= 3) {
          // Show individual item names if there are 3 or fewer
          description = `Moved ${movedItems.names.join(', ')} to folder`
        } else {
          // Otherwise just show the count
          description = `Moved ${movedItems.successful} items to folder`
        }

        addToast({
          title: 'Items moved',
          description,
          type: 'success',
        })
      }

      if (movedItems.failed > 0) {
        addToast({
          title: 'Move incomplete',
          description: `Failed to move ${movedItems.failed} items`,
          type: 'warning',
        })
      }

      // Refresh the data based on current view
      if (tabState === MyAccountTabType.TRASH) {
        await refreshTrash()
      } else if (tabState === MyAccountTabType.SHARED) {
        await refreshSharedFiles()
      } else {
        await refreshFolderContents()
      }

      setLoading(false)
    } catch (error) {
      console.error('Error moving items:', error)
      setErrorMessage('Failed to move items')
      setLoading(false)

      // Show error toast
      addToast({
        title: 'Move failed',
        description: 'An error occurred while moving items',
        type: 'error',
      })
    }
  }

  // Handle creating a shortcut to a folder or network
  const handleCreateShortcut = async (
    itemId: string,
    targetFolderId?: string,
  ) => {
    if (!isAuthenticated) {
      addToast({
        title: 'Authentication required',
        description: 'Please sign in to create shortcuts',
        type: 'error',
      })
      return
    }

    try {
      setLoading(true)

      // Find the item to create a shortcut for
      const itemToShortcut = displayItems.find((item) => item.uuid === itemId)
      if (!itemToShortcut) {
        throw new Error('Item not found')
      }

      // Generate shortcut name
      const shortcutName = `${itemToShortcut.name} - Shortcut`

      // If targetFolderId is null, create in the current folder
      const parentFolder = targetFolderId || folderId || null

      // Create the shortcut using the hook
      await createShortcut(
        shortcutName,
        parentFolder,
        itemId,
        itemToShortcut.type,
      )

      // Refresh folder contents
      if (tabState === MyAccountTabType.SHARED) {
        await refreshSharedFiles()
      } else {
        await refreshFolderContents()
      }

      // Success notification
      addToast({
        title: 'Shortcut created',
        description: `Shortcut to ${itemToShortcut.name} created successfully`,
        type: 'success',
      })

      // Close any open dropdown
      setOpenDropdownId(null)
      setDropdownType(null)
    } catch (error: any) {
      console.error('Error creating shortcut:', error)

      addToast({
        title: 'Failed to create shortcut',
        description: error.message || 'An unexpected error occurred',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing || !isAuthenticated || !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  if (currentLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  if (currentError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {renderErrorMessage(currentError.message)}
      </div>
    )
  }

  return (
    <div className="flex h-screen gap-x-4 p-2">
      {/* Sidebar */}
      <SideBar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentFolderId={folderId}
        activeView={tabState}
      />

      {/* Main Content and Details Panel Container */}
      <div className="flex-1 flex h-full overflow-hidden gap-x-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-card border border-border rounded-md transition-all duration-300 ease-in-out">
          {/* Header */}
          <header className="px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* Breadcrumb navigation */}
              <div className="flex items-center gap-1">
                {breadcrumbPath.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <button
                      className={`text-${
                        index === breadcrumbPath.length - 1
                          ? 'xl font-semibold text-foreground'
                          : 'sm text-muted-foreground'
                      } hover:underline hover:text-foreground transition-colors`}
                      onClick={() => handleBreadcrumbClick(crumb.id)}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-full overflow-hidden border border-border">
                <button
                  className={`flex items-center justify-center p-2 w-10 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  className={`flex items-center justify-center p-2 w-10 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid className="h-5 w-5" />
                </button>
              </div>
              <button
                className={`p-3 rounded-full transition-colors ${
                  detailsOpen ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => setDetailsOpen(!detailsOpen)}
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Selection Toolbar or Filters */}
          <SelectionToolbarAndFilters
            selectedItems={selectedItems}
            showSelectionToolbar={showSelectionToolbar}
            tabState={tabState}
            handleCloseToolbar={handleCloseToolbar}
            handleRestoreFromTrash={handleRestoreFromTrash}
            handlePermanentDelete={handlePermanentDelete}
            handleDeleteItems={handleDeleteItems}
            handleMoveItems={handleMoveItems}
            currentFolderId={folderId}
            onFiltersChange={handleFiltersChange}
            initialFilterState={{
              selectedFilters,
              filterValues,
            }}
          />

          {/* Main content with DnD support */}
          <DndProvider backend={HTML5Backend}>
            <FileRenderer
              tabState={tabState}
              filteredItems={filteredItems}
              displayItems={displayItems}
              trashItems={trashItems}
              viewMode={viewMode}
              selectedItems={selectedItems}
              currentFolderId={folderId}
              handleItemSelect={handleItemSelect}
              handleOutsideClick={handleOutsideClick}
              handleMoveItems={handleMoveItems}
              handleDropdownToggle={handleDropdownToggle}
              setSelectedFilters={setSelectedFilters}
            />
            {/* Replace renderActionDropdown() with ActionDropdown component */}
            {openDropdownId && (
              <ActionDropdown
                openDropdownId={openDropdownId}
                dropdownType={dropdownType}
                item={
                  filteredItems.find((item) => item.uuid === openDropdownId) ||
                  null
                }
                tabState={tabState}
                onClose={() => {
                  setOpenDropdownId(null)
                  setDropdownType(null)
                }}
                onDelete={handleDeleteItems}
                onRestore={handleRestoreFromTrash}
                onCreateShortcut={handleCreateShortcut}
                onMoveItems={handleMoveItems}
              />
            )}
          </DndProvider>
        </div>

        {/* Details panel */}
        {detailsOpen && (
          <DetailsPanel
            isOpen={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            selectedItems={selectedItems}
            allItems={displayItems}
          />
        )}
      </div>
    </div>
  )
}

// Export the component wrapped with necessary providers
export default function MyAccount(props: MyAccountProps) {
  return (
    <DialogProvider>
      <MyAccountContent {...props} />
    </DialogProvider>
  )
}
