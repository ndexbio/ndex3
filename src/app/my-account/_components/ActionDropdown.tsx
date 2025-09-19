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
} from 'lucide-react'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useDialogs } from '@/lib/contexts/DialogContext'
import { useNetworkDownload } from '@/hooks/use-network-download'
import { useNetworkCopy } from '@/hooks/use-network-copy'

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
}) => {
  const actionDropdownRef = useRef<HTMLDivElement>(null)
  const {
    openRenameFolderDialog,
    openMoveFolderDialog,
    openEditNetworkPropertiesDialog,
  } = useDialogs()
  const { copyFile, isCopying } = useNetworkCopy()

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
  const handleButtonClick = (callback: Function) => (e: React.MouseEvent) => {
    e.stopPropagation()
    callback()
  }

  // Handle opening the rename dialog
  const handleOpenRenameDialog = () => {
    // Use the dialog context to open the rename dialog
    openRenameFolderDialog(
      openDropdownId,
      item.name,
      (item as any).parent || '',
    )
    onClose() // Close the dropdown
  }

  // Handle opening the edit properties dialog
  const handleOpenEditPropertiesDialog = () => {
    openEditNetworkPropertiesDialog(openDropdownId)
    onClose() // Close the dropdown
  }

  // Handle opening the move dialog
  const handleOpenMoveDialog = () => {
    if (onMoveItems) {
      // Open the move dialog with the current item ID
      openMoveFolderDialog(
        [openDropdownId],
        (item as any).parent || null,
        (targetFolderId: string) =>
          onMoveItems([openDropdownId], targetFolderId),
      )
      onClose() // Close the dropdown
    }
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
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => onClose())}
          >
            <Download className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Download
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenRenameDialog)}
          >
            <FileEdit className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Rename
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => onClose())}
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
      ) : (
        // Network options
        <div className="py-2">
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => onClose())}
          >
            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Open in Cytoscape Desktop
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => onClose())}
          >
            <BookCopy className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Request DOI
          </button>
          <DownloadMenu
            networkId={openDropdownId}
            networkName={item.name || 'network'}
            onClose={onClose}
          />
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenEditPropertiesDialog)}
          >
            <FileEdit className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Edit Properties
          </button>
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
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(() => onClose())}
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
      )}
    </div>
  )
}

export default ActionDropdown
