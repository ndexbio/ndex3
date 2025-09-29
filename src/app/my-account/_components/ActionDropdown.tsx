import React, { useRef, useEffect, useState } from 'react'
import {
  Download,
  FileEdit,
  UserPlus,
  FolderInput,
  FileSymlink,
  Trash2,
  ExternalLink,
  BookCopy,
  Copy,
  History,
  Loader2,
  Lock,
  LockOpen,
} from 'lucide-react'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { FileItemBase } from '@/types/api/ndex/File'
import { Folder } from '@/hooks/use-folder'
import { NDExFileType, Visibility } from '@js4cytoscape/ndex-client'
import { useDialogs } from '@/lib/contexts/DialogContext'
import { useNetworkDownload } from '@/hooks/use-network-download'
import { useNetworkCopy } from '@/hooks/use-network-copy'
import { useNetworkReadOnly } from '@/hooks/use-network-readonly'
import { hasNetworkError, hasValidDOI as hasValidNetworkDOI, isNetworkReadOnly } from '@/lib/utils/network-status'

// Add a dropdown menu for download formats
const DownloadMenu: React.FC<{
  networkId: string
  networkName: string
  onClose: () => void
}> = ({ networkId, networkName, onClose }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { downloadNetwork, isDownloading } = useNetworkDownload()

  const handleDownload = async (format: 'CX' | 'CX2') => {
    await downloadNetwork(networkId, networkName, { format })
    setIsOpen(false)
    onClose()
  }

  return (
    <div className="relative">
      <button
        className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
      >
        <Download className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
        {isDownloading[networkId] ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Downloading...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span>Download</span>
            <span className="text-xs text-gray-500">▶</span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-full top-0 ml-1 w-44 rounded-md bg-white shadow-lg">
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload('CX')
            }}
          >
            <span>CX Format</span>
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload('CX2')
            }}
          >
            <span>CX2 Format</span>
          </button>
        </div>
      )}
    </div>
  )
}

interface ActionDropdownProps {
  openDropdownId: string | null
  dropdownType: NDExFileType | null
  item: FileItemBase | null
  tabState: MyAccountTabType
  currentFolderId: string | null
  onClose: () => void
  onDelete: (itemIds: string[]) => Promise<void>
  onRestore: (itemIds: string[]) => Promise<void>
  onCreateShortcut: (itemId: string, targetFolderId?: string) => Promise<void>
  onMoveItems?: (itemIds: string[], targetFolderId: string) => Promise<void>
  onShareSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void
}

// Helper functions using the network status utility
const hasValidDOI = (item: FileItemBase | null): boolean => {
  if (!item) return false
  return hasValidNetworkDOI(item)
}

const isReadOnlyNetwork = (item: FileItemBase | null): boolean => {
  if (!item) return false
  return isNetworkReadOnly(item)
}

const networkHasError = (item: FileItemBase | null): boolean => {
  if (!item) return false
  return hasNetworkError(item)
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  openDropdownId,
  dropdownType,
  item,
  tabState,
  currentFolderId,
  onClose,
  onDelete,
  onRestore,
  onCreateShortcut,
  onMoveItems,
  onShareSuccess,
}) => {
  const actionDropdownRef = useRef<HTMLDivElement>(null)
  const {
    openRenameFolderDialog,
    openMoveFolderDialog,
    openEditNetworkPropertiesDialog,
    openEditFolderPropertiesDialog,
    openRenameShortcutDialog,
    openShareDialog,
  } = useDialogs()
  const { copyFile, isCopying } = useNetworkCopy()
  const { setNetworkReadOnly, isUpdating } = useNetworkReadOnly()

  // Check DOI, readonly status, and error status for networks
  const hasDOI = dropdownType === NDExFileType.NETWORK && hasValidDOI(item)
  const isReadOnly = dropdownType === NDExFileType.NETWORK && isReadOnlyNetwork(item)
  const hasError = dropdownType === NDExFileType.NETWORK && networkHasError(item)

  // Determine when to show Request DOI button
  const shouldShowRequestDOI =
    dropdownType === NDExFileType.NETWORK && // Only for networks
    item.type !== NDExFileType.SHORTCUT && // Not for shortcuts
    tabState !== MyAccountTabType.SHARED // Not in "Shared with me" tab (only owners can request DOI)

  // Determine which menu items should be disabled
  const shouldDisableRequestDOI = hasDOI
  const shouldDisableEditProperties = hasDOI || isReadOnly
  const shouldDisableShare = false  // Share is always enabled
  const shouldDisableMoveToTrash = hasDOI || isReadOnly

  // Tooltip messages for disabled items
  const getMoveToTrashTooltip = (): string => {
    if (hasDOI) return "Networks with DOI can't be deleted"
    if (isReadOnly) return "Read-only networks can't be deleted"
    return ""
  }

  // Add an effect to mark the component as mounted for event handling
  useEffect(() => {
    // Add a data attribute to the document body so we can identify that the dropdown is open
    document.body.setAttribute('data-dropdown-active', 'true')

    return () => {
      // Clean up when unmounted
      document.body.removeAttribute('data-dropdown-active')
    }
  }, [])

  if (!openDropdownId || !item) return null

  // Position the dropdown
  const targetElement = document.querySelector(
    `[data-dropdown-id="${openDropdownId}"]`,
  ) as HTMLElement
  if (!targetElement) return null

  // Calculate position
  const rect = targetElement.getBoundingClientRect()

  // Check if dropdown would go off-screen horizontally
  const isRightAligned = window.innerWidth - rect.right < 180

  // Estimate dropdown height - these are approximate
  const dropdownHeight =
    dropdownType === NDExFileType.NETWORK
      ? 340
      : dropdownType === NDExFileType.FOLDER
      ? 240
      : 40

  // Check if dropdown would go below viewport
  const wouldGoBelow = rect.bottom + dropdownHeight > window.innerHeight

  // Set vertical position
  const verticalPosition = wouldGoBelow
    ? { bottom: `${window.innerHeight - rect.top + 5}px` }
    : { top: `${rect.bottom + window.scrollY + 5}px` }

  // Set horizontal position
  const horizontalPosition = isRightAligned
    ? { right: `${window.innerWidth - rect.right}px` }
    : { left: `${rect.left}px` }

  const style = {
    ...verticalPosition,
    ...horizontalPosition,
  }

  // Function to prevent event bubbling for button clicks
  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    callback()
  }

  // Handle opening the rename dialog - differentiate shortcuts from folders
  const handleOpenRenameDialog = () => {
    if (item.type === NDExFileType.SHORTCUT) {
      // For shortcuts, use the shortcut rename dialog
      openRenameShortcutDialog(openDropdownId)
    } else {
      // For regular folders, use the folder rename dialog
      openRenameFolderDialog(
        openDropdownId,
        item.name,
        (item as Folder)?.parent || '',
      )
    }
    onClose() // Close the dropdown
  }

  // Handle opening the edit properties dialog
  const handleOpenEditPropertiesDialog = () => {
    openEditNetworkPropertiesDialog(openDropdownId)
    onClose() // Close the dropdown
  }

  // Handle opening the edit folder properties dialog
  const handleOpenEditFolderPropertiesDialog = () => {
    openEditFolderPropertiesDialog(openDropdownId)
    onClose() // Close the dropdown
  }

  // Handle opening the move dialog
  const handleOpenMoveDialog = () => {
    if (onMoveItems) {
      // Open the move dialog with the current item ID
      openMoveFolderDialog(
        [openDropdownId],
        (item as Folder)?.parent || null,
        (targetFolderId: string) =>
          onMoveItems([openDropdownId], targetFolderId),
      )
      onClose() // Close the dropdown
    }
  }

  const handleOpenShareDialog = () => {
    if (!item || !openDropdownId) return

    const shareableItem = {
      uuid: openDropdownId,
      name: item.name || 'Unnamed item',
      type: item.type, // Use the item's type directly
      currentPermissions: [], // TODO: Load existing permissions
      visibility: (item.attributes?.visibility as Visibility) || Visibility.PRIVATE,
    }

    openShareDialog([shareableItem], 'single', onShareSuccess)
    onClose() // Close the dropdown
  }

  // Handle copying the file
  const handleCopyFile = async () => {
    if (!item || !openDropdownId) return

    // Use the currentFolderId passed as prop, keeping null for home directory
    const parentFolderId = currentFolderId

    await copyFile(
      openDropdownId,
      item.name || 'Unnamed file',
      dropdownType || NDExFileType.NETWORK,
      parentFolderId
    )

    onClose() // Close the dropdown
  }

  // Handle toggling readonly status
  const handleToggleReadOnly = async () => {
    if (!item || !openDropdownId) return

    const success = await setNetworkReadOnly(openDropdownId, !isReadOnly)
    if (success) {
      // Refresh will be triggered by parent component
      onClose()
    }
  }

  // Render different options based on tabState
  return (
    <div
      ref={actionDropdownRef}
      className="fixed z-50 mt-1 min-w-[220px] rounded-md bg-white shadow-lg shadow-gray-400 focus:outline-none"
      style={style}
      data-dropdown-menu="true"
      onClick={(e) => e.stopPropagation()}
    >
      {tabState === MyAccountTabType.TRASH ? (
        // Trash tab - only show restore and delete options
        <div className="py-2">
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => {
              if (onRestore) onRestore([openDropdownId])
              onClose()
            })}
          >
            <History className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Restore
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => {
              onDelete([openDropdownId])
              onClose()
            })}
          >
            <Trash2 className="h-4 w-4 text-red-500 group-hover:text-red-700" />
            Delete permanently
          </button>
        </div>
      ) : dropdownType === NDExFileType.FOLDER ? (
        // Regular folder options
        <div className="py-2">
          {/* Show Rename for shortcuts, Edit Properties for regular folders */}
          {item.type === NDExFileType.SHORTCUT ? (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(handleOpenRenameDialog)}
            >
              <FileEdit className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              Rename
            </button>
          ) : (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(handleOpenEditFolderPropertiesDialog)}
            >
              <FileEdit className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              Edit Properties
            </button>
          )}
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenShareDialog)}
          >
            <UserPlus className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Share
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenMoveDialog)}
          >
            <FolderInput className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Move
          </button>
          {/* Only show "Add Shortcut" if the item is not already a shortcut */}
          {item.type !== NDExFileType.SHORTCUT && (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(() => {
                onCreateShortcut(openDropdownId)
                onClose()
              })}
            >
              <FileSymlink className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              Add Shortcut
            </button>
          )}
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => {
              onDelete([openDropdownId])
              onClose()
            })}
          >
            <Trash2 className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Move to Trash
          </button>
        </div>
      ) : hasError ? (
        // Networks with errors - only show Download and Move to Trash
        <div className="py-2">
          <DownloadMenu
            networkId={openDropdownId}
            networkName={item.name || 'network'}
            onClose={onClose}
          />
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => {
              onDelete([openDropdownId])
              onClose()
            })}
          >
            <Trash2 className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Move to Trash
          </button>
        </div>
      ) : (
        // Regular network options (no errors)
        <div className="py-2">
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenShareDialog)}
          >
            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Open in Cytoscape Desktop
          </button>
          {/* Only show "Request DOI" for networks that aren't shortcuts and not in shared tab */}
          {shouldShowRequestDOI && (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableRequestDOI
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={shouldDisableRequestDOI ? undefined : handleButtonClick(handleOpenShareDialog)}
              disabled={shouldDisableRequestDOI}
            >
              <BookCopy className={`h-4 w-4 ${
                shouldDisableRequestDOI
                  ? 'text-gray-400'
                  : 'text-gray-500 group-hover:text-gray-700'
              }`} />
              Request DOI
            </button>
          )}
          <DownloadMenu
            networkId={openDropdownId}
            networkName={item.name || 'network'}
            onClose={onClose}
          />
          {/* Show Rename for shortcuts, Edit Properties for regular networks */}
          {item.type === NDExFileType.SHORTCUT ? (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(handleOpenRenameDialog)}
            >
              <FileEdit className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              Rename
            </button>
          ) : (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableEditProperties
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={shouldDisableEditProperties ? undefined : handleButtonClick(handleOpenEditPropertiesDialog)}
              disabled={shouldDisableEditProperties}
            >
              <FileEdit className={`h-4 w-4 ${
                shouldDisableEditProperties
                  ? 'text-gray-400'
                  : 'text-gray-500 group-hover:text-gray-700'
              }`} />
              Edit Properties
            </button>
          )}
          {/* Only show Make a Copy for regular networks, not shortcuts */}
          {item.type !== NDExFileType.SHORTCUT && (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(handleCopyFile)}
              disabled={isCopying[openDropdownId]}
            >
              {isCopying[openDropdownId] ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              )}
              {isCopying[openDropdownId] ? 'Copying...' : 'Make a Copy'}
            </button>
          )}
          <button
            className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
              shouldDisableShare
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={shouldDisableShare ? undefined : handleButtonClick(handleOpenShareDialog)}
            disabled={shouldDisableShare}
          >
            <UserPlus className={`h-4 w-4 ${
              shouldDisableShare
                ? 'text-gray-400'
                : 'text-gray-500 group-hover:text-gray-700'
            }`} />
            Share
          </button>
          {/* Only show readonly toggle for regular networks (not shortcuts) and not in shared tab */}
          {item.type !== NDExFileType.SHORTCUT && tabState !== MyAccountTabType.SHARED && (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                isUpdating[openDropdownId]
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={isUpdating[openDropdownId] ? undefined : handleButtonClick(handleToggleReadOnly)}
              disabled={isUpdating[openDropdownId]}
            >
              {isUpdating[openDropdownId] ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : isReadOnly ? (
                <LockOpen className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              ) : (
                <Lock className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              )}
              {isUpdating[openDropdownId] ? 'Updating...' : isReadOnly ? 'Remove Read-only' : 'Set as Read-only'}
            </button>
          )}
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenMoveDialog)}
          >
            <FolderInput className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Move
          </button>
          {/* Only show "Add a Shortcut" if the item is not already a shortcut */}
          {item.type !== NDExFileType.SHORTCUT && (
            <button
              className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleButtonClick(() => {
                onCreateShortcut(openDropdownId)
                onClose()
              })}
            >
              <FileSymlink className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
              Add a Shortcut
            </button>
          )}
          <div title={shouldDisableMoveToTrash ? getMoveToTrashTooltip() : ""}>
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableMoveToTrash
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={shouldDisableMoveToTrash ? undefined : handleButtonClick(() => {
                onDelete([openDropdownId])
                onClose()
              })}
              disabled={shouldDisableMoveToTrash}
            >
              <Trash2 className={`h-4 w-4 ${
                shouldDisableMoveToTrash
                  ? 'text-gray-400'
                  : 'text-gray-500 group-hover:text-gray-700'
              }`} />
              Move to Trash
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActionDropdown
