import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  UserPlus,
  Download,
  FolderInput,
  Trash2,
  History,
  SlidersHorizontal,
  Check,
  RefreshCw,
  ChevronDown,
  DownloadIcon,
  Loader2,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MyAccountTabType, FilterOptionType } from '@/types/ui/myAccount'
import { useTrash } from '@/hooks/use-trash'
import { useDialogs } from '@/lib/contexts/DialogContext'
import { useNetworkDownload } from '@/hooks/use-network-download'
import { NDExFileType } from '@js4cytoscape/ndex-client'

// Add a dropdown menu for bulk network downloads
const BulkDownloadMenu: React.FC<{
  selectedItems: Array<{ id: string; name: string; type: NDExFileType }>
  onClose: () => void
}> = ({ selectedItems, onClose }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { downloadMultipleNetworks } = useNetworkDownload()

  // Filter selected items to only include networks
  const networkItems = selectedItems
    .filter((item) => item.type === NDExFileType.NETWORK)
    .map((item) => ({
      id: item.id,
      name: item.name,
    }))

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDownload = async (format: 'CX' | 'CX2') => {
    if (networkItems.length === 0) return

    setIsDownloading(true)
    try {
      await downloadMultipleNetworks(networkItems, { format })
    } catch (error) {
      console.error('Error downloading networks:', error)
    } finally {
      setIsDownloading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Download selected networks"
              data-action-button
              onClick={() => setIsOpen(!isOpen)}
              disabled={networkItems.length === 0 || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <DownloadIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Download selected networks
            {networkItems.length === 0 && ' (Only networks can be downloaded)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-44 rounded-md bg-popover shadow-lg z-50 border border-border">
          <div className="py-1 text-sm font-medium text-popover-foreground px-3 border-b border-border">
            Download Format
          </div>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleDownload('CX')}
            disabled={isDownloading || networkItems.length === 0}
          >
            <span>CX Format</span>
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => handleDownload('CX2')}
            disabled={isDownloading || networkItems.length === 0}
          >
            <span>CX2 Format</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Helper function to format date string (MM/DD/YYYY) to input format (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  if (!dateString) return ''

  // Check if dateString is already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }

  // Parse MM/DD/YYYY
  const parts = dateString.split('/')
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0')
    const day = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }

  // If the date is in another format, try to parse with Date object
  try {
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (e) {
    console.error('Error parsing date', e)
  }

  return ''
}

// Helper function to format date from input format (YYYY-MM-DD) to display format (MM/DD/YYYY)
const formatDateFromInput = (dateString: string): string => {
  if (!dateString) return ''

  // Input is already in YYYY-MM-DD format
  const parts = dateString.split('-')
  if (parts.length === 3) {
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]
    return `${month}/${day}/${year}`
  }

  return dateString
}

// Define the filter interface used internally
export interface FilterState {
  edgeCount: { min: string; max: string }
  nodeCount: { min: string; max: string }
  modificationTime: { start: string; end: string }
}

// Simplified props interface without filter state and handlers
interface SelectionToolbarAndFiltersProps {
  selectedItems: string[]
  itemDataMap?: Record<string, { name: string; type: NDExFileType }>
  showSelectionToolbar: boolean
  tabState: MyAccountTabType
  handleCloseToolbar: (event: React.MouseEvent) => void
  handleRestoreFromTrash: (ids: string[]) => void
  handlePermanentDelete: (ids?: string[]) => void
  handleDeleteItems: (ids: string[]) => void
  handleMoveItems?: (ids: string[], targetFolderId: string) => Promise<void>
  currentFolderId?: string | null
  onFiltersChange?: (
    selectedFilters: Set<FilterOptionType>,
    filterValues: FilterState,
  ) => void
  initialFilterState?: {
    selectedFilters: Set<FilterOptionType>
    filterValues: FilterState
  }
}

// Filter labels
const filterLabels: Record<FilterOptionType, string> = {
  edgeCount: 'Edge Count',
  nodeCount: 'Node Count',
  modificationTime: 'Modification Time',
}

// Default filter values
const defaultFilterValues: FilterState = {
  edgeCount: { min: '', max: '' },
  nodeCount: { min: '', max: '' },
  modificationTime: { start: '', end: '' },
}

const SelectionToolbarAndFilters: React.FC<SelectionToolbarAndFiltersProps> = ({
  selectedItems,
  itemDataMap = {},
  showSelectionToolbar,
  tabState,
  handleCloseToolbar,
  handleRestoreFromTrash,
  handlePermanentDelete,
  handleDeleteItems,
  handleMoveItems,
  currentFolderId = null,
  onFiltersChange,
  initialFilterState,
}) => {
  // Access the dialog context
  const { openMoveFolderDialog } = useDialogs()

  // Internal state for filters
  const [filterValues, setFilterValues] = useState<FilterState>(
    initialFilterState?.filterValues || defaultFilterValues,
  )
  const [selectedFilters, setSelectedFilters] = useState<Set<FilterOptionType>>(
    initialFilterState?.selectedFilters || new Set(),
  )
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [activeFilterDropdown, setActiveFilterDropdown] =
    useState<FilterOptionType | null>(null)

  // Reference for filter dropdown
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Function to toggle a filter
  const toggleFilter = (type: FilterOptionType) => {
    const newSelectedFilters = new Set(selectedFilters)
    if (newSelectedFilters.has(type)) {
      newSelectedFilters.delete(type)
    } else {
      newSelectedFilters.add(type)
    }
    setSelectedFilters(newSelectedFilters)

    // Notify parent
    if (onFiltersChange) {
      onFiltersChange(newSelectedFilters, filterValues)
    }
  }

  // Handle filter value change
  const handleFilterValueChange = (
    type: FilterOptionType,
    field: string,
    value: string,
  ) => {
    const newFilterValues = {
      ...filterValues,
      [type]: {
        ...filterValues[type],
        [field]: value,
      },
    }
    setFilterValues(newFilterValues)

    // Notify parent (with a small delay to allow multiple changes before notifying)
    if (onFiltersChange) {
      // Use a debounced notification to avoid too many updates
      // In a real implementation, you might want to use a debounce function from lodash or similar
      setTimeout(() => {
        onFiltersChange(selectedFilters, newFilterValues)
      }, 300)
    }
  }

  // Handle opening filter dropdown for editing
  const openFilterDropdown = (
    event: React.MouseEvent,
    type: FilterOptionType,
  ) => {
    event.stopPropagation()
    setActiveFilterDropdown(activeFilterDropdown === type ? null : type)
  }

  // Reset all filters
  const resetFilters = () => {
    setSelectedFilters(new Set())
    setFilterValues(defaultFilterValues)

    // Notify parent
    if (onFiltersChange) {
      onFiltersChange(new Set(), defaultFilterValues)
    }
  }

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

  // Handle opening move dialog
  const handleOpenMoveDialog = () => {
    if (handleMoveItems && selectedItems.length > 0) {
      openMoveFolderDialog(
        selectedItems,
        currentFolderId,
        (targetFolderId: string) =>
          handleMoveItems(selectedItems, targetFolderId),
      )
    }
  }

  // Create array of item objects for the BulkDownloadMenu component
  const getSelectedItemObjects = () => {
    return selectedItems.map((id) => ({
      id,
      name: itemDataMap[id]?.name || `item_${id}`,
      type: itemDataMap[id]?.type || NDExFileType.NETWORK, // Default to NETWORK if no type specified
    }))
  }

  return (
    <div className="mt-1 mb-3 mx-4">
      {selectedItems.length > 0 && showSelectionToolbar ? (
        <div className="px-6 py-2 flex items-center justify-start bg-muted rounded-lg h-12">
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={handleCloseToolbar}
              title="Hide toolbar"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground mr-8">
              {selectedItems.length}{' '}
              {selectedItems.length === 1 ? 'item' : 'items'} selected
            </span>
          </div>
          <div className="flex items-center gap-4">
            {tabState === MyAccountTabType.TRASH ? (
              // Trash-specific actions
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Restore from trash"
                        data-action-button
                        onClick={() => handleRestoreFromTrash(selectedItems)}
                      >
                        <History className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Restore from trash</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Permanently delete"
                        data-action-button
                        onClick={() => handlePermanentDelete(selectedItems)}
                      >
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Permanently delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              // Regular actions for My Networks and Shared
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Share"
                        data-action-button
                      >
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Share with others</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BulkDownloadMenu
                        selectedItems={getSelectedItemObjects()}
                        onClose={() => {}}
                      />
                    </TooltipTrigger>
                    <TooltipContent>Download selected networks</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Move"
                        data-action-button
                        onClick={handleOpenMoveDialog}
                      >
                        <FolderInput className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Move selected items</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-1.5 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                        title="Delete"
                        data-action-button
                        onClick={() => handleDeleteItems(selectedItems)}
                      >
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Move to trash</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex">
          {tabState === MyAccountTabType.MYNETWORKS && (
            <>
              <div className="relative ml-2 mr-2 h-12" ref={filterDropdownRef}>
                {/* Main filter button styled like the image */}
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-background border border-border text-primary hover:bg-accent hover:text-accent-foreground h-10 transition-colors"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  <span className="font-medium">All filters</span>
                </button>

                {/* Filter dropdown with checkboxes */}
                {filterDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 rounded-md bg-popover border border-border shadow-sm z-10 p-5">
                    <h3 className="text-base font-medium text-popover-foreground mb-4">
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
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center">
                              <label className="text-sm text-gray-600 w-16">
                                From:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="date"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                  value={
                                    filterValues.modificationTime.start
                                      ? formatDateForInput(
                                          filterValues.modificationTime.start,
                                        )
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const formattedDate = e.target.value
                                      ? formatDateFromInput(e.target.value)
                                      : ''
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'start',
                                      formattedDate,
                                    )
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center">
                              <label className="text-sm text-gray-600 w-16">
                                To:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="date"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                  value={
                                    filterValues.modificationTime.end
                                      ? formatDateForInput(
                                          filterValues.modificationTime.end,
                                        )
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const formattedDate = e.target.value
                                      ? formatDateFromInput(e.target.value)
                                      : ''
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'end',
                                      formattedDate,
                                    )
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 h-12">
                {(
                  [
                    'edgeCount',
                    'nodeCount',
                    'modificationTime',
                  ] as FilterOptionType[]
                ).map((filterType) => (
                  <div key={filterType} className="relative">
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm cursor-pointer h-10 ${
                        selectedFilters.has(filterType)
                          ? 'bg-sky-50'
                          : 'bg-transparent'
                      }`}
                      onClick={(e) => openFilterDropdown(e, filterType)}
                      data-filter-dropdown
                    >
                      <span className="font-medium">
                        {filterLabels[filterType]}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500 ml-1" />
                      {selectedFilters.has(filterType) && (
                        <button
                          className="text-gray-500 hover:text-gray-700 ml-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFilter(filterType)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
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
                                  type="date"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                  value={
                                    filterValues.modificationTime.start
                                      ? formatDateForInput(
                                          filterValues.modificationTime.start,
                                        )
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const formattedDate = e.target.value
                                      ? formatDateFromInput(e.target.value)
                                      : ''
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'start',
                                      formattedDate,
                                    )
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center">
                              <label className="text-sm text-gray-600 w-16">
                                To:
                              </label>
                              <div className="relative flex-1">
                                <input
                                  type="date"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                                  value={
                                    filterValues.modificationTime.end
                                      ? formatDateForInput(
                                          filterValues.modificationTime.end,
                                        )
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const formattedDate = e.target.value
                                      ? formatDateFromInput(e.target.value)
                                      : ''
                                    handleFilterValueChange(
                                      'modificationTime',
                                      'end',
                                      formattedDate,
                                    )
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end mt-4">
                          <button
                            className="px-3 py-1.5 bg-sky-700 text-white text-sm rounded hover:bg-sky-600"
                            onClick={() => {
                              // If not already selected, add to selected filters
                              if (!selectedFilters.has(filterType)) {
                                toggleFilter(filterType)
                              }
                              setActiveFilterDropdown(null)
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Clear all filters button - only shown when filters are active */}
                {selectedFilters.size > 0 && (
                  <button
                    className="flex items-center gap-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 h-10"
                    onClick={resetFilters}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Show trash info message when in trash view */}
          {tabState === MyAccountTabType.TRASH && (
            <div className="w-full flex items-center justify-between px-6 py-2 rounded-lg bg-gray-100 text-gray-700 border-b border-gray-200 h-12">
              <div>Items in trash will be deleted forever after 30 days</div>
              <button
                className="text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => {
                  handlePermanentDelete()
                }}
              >
                Empty trash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SelectionToolbarAndFilters
