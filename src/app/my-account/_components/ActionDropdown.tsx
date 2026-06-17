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
import { NDExFileType, Visibility, Permission } from '@js4cytoscape/ndex-client'
import { useDialogs } from '@/lib/contexts/DialogContext'
import { useNetworkDownload } from '@/hooks/use-network-download'
import { useNetworkCopy } from '@/hooks/use-network-copy'
import { useNetworkReadOnly } from '@/hooks/use-network-readonly'
import { useCyNDEx } from '@/hooks/use-cyndex'
import { hasNetworkError, hasValidDOI as hasValidNetworkDOI, isNetworkReadOnly } from '@/lib/utils/network-status'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useConfig } from '@/lib/contexts/ConfigContext'

// Add a dropdown menu for download formats
const DownloadMenu: React.FC<{
  networkId: string
  networkName: string
  onClose: () => void
  openToLeft?: boolean
}> = ({ networkId, networkName, onClose, openToLeft }) => {
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
        <div className={`absolute ${openToLeft ? 'right-full mr-1' : 'left-full ml-1'} top-0 w-44 rounded-md bg-white shadow-lg`}>
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
  currentFolderName?: string
  onClose: () => void
  onDelete: (itemIds: string[]) => Promise<void>
  onRestore: (itemIds: string[]) => Promise<void>
  onRefreshFolder?: () => Promise<void>
  onClearSelection?: () => void
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
  currentFolderName,
  onClose,
  onDelete,
  onRestore,
  onRefreshFolder,
  onClearSelection,
  onCreateShortcut,
  onMoveItems,
  onShareSuccess,
}) => {
  const actionDropdownRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated: isSignedIn } = useAuth()
  const {
    openRenameFolderDialog,
    openMoveFolderDialog,
    openEditNetworkPropertiesDialog,
    openEditFolderPropertiesDialog,
    openRenameShortcutDialog,
    openCreateDOIDialog,
    openShareDialog,
  } = useDialogs()
  const { copyFile, isCopying } = useNetworkCopy()
  const { setNetworkReadOnly, isUpdating } = useNetworkReadOnly()
  const { openInCytoscape, isOpening, isCytoscapeAvailable, isCheckingCytoscape } = useCyNDEx()
  const config = useConfig()

  // Check DOI, readonly status, and error status for networks
  const hasDOI = dropdownType === NDExFileType.NETWORK && hasValidDOI(item)
  const isReadOnly = dropdownType === NDExFileType.NETWORK && isReadOnlyNetwork(item)
  const hasError = dropdownType === NDExFileType.NETWORK && networkHasError(item)

  // Check if the current user is the owner
  const isOwner = item?.owner === user?.userName

  // Check permission - in Shared tab, user needs WRITE permission to edit
  const hasWritePermission = item?.permission === Permission.WRITE

  // Can the user edit this item? (owner or has write permission)
  const canEdit = isOwner || hasWritePermission

  // Determine when to show Request DOI button (owner-only, networks only, not shortcuts)
  const shouldShowRequestDOI =
    dropdownType === NDExFileType.NETWORK &&
    item?.type !== NDExFileType.SHORTCUT &&
    isOwner

  // Determine which menu items should be disabled
  const shouldDisableRequestDOI = hasDOI
  const shouldDisableEditProperties =
    hasDOI ||
    isReadOnly ||
    !canEdit
  const shouldDisableRenameShortcut = !canEdit
  const shouldDisableShare = !canEdit
  const shouldDisableMoveToTrash = hasDOI || isReadOnly
  const shouldDisableMove = !canEdit

  // Hide Move to Trash if not the owner
  const shouldHideMoveToTrash = !isOwner

  // Tooltip messages for disabled items
  const getMoveToTrashTooltip = (): string => {
    if (hasDOI) return "Networks with DOI can't be deleted"
    if (isReadOnly) return "Read-only networks can't be deleted"
    return ""
  }

  // "Open in Cytoscape Desktop" is only enabled when Cytoscape Desktop is running
  // and reachable (CyNDEx-2 responding on localhost). Disabled while we're still
  // probing or when it can't be reached.
  const isCytoscapeOpening = openDropdownId ? isOpening[openDropdownId] : false
  const shouldDisableOpenInCytoscape =
    isCytoscapeOpening || isCheckingCytoscape || !isCytoscapeAvailable

  const getOpenInCytoscapeTooltip = (): string => {
    if (isCytoscapeOpening) return ''
    if (isCheckingCytoscape) return 'Checking for Cytoscape Desktop…'
    if (!isCytoscapeAvailable) {
      return 'Cannot connect to Cytoscape. Please make sure Cytoscape Desktop is installed and running (with the CyNDEx-2 app), then try again.'
    }
    return ''
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

  // Check if dropdown would go off-screen horizontally (increased threshold to account for submenus)
  const isRightAligned = window.innerWidth - rect.right < 240

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
      openRenameShortcutDialog(openDropdownId, onRefreshFolder)
    } else {
      openRenameFolderDialog(
        openDropdownId,
        item.name,
        (item as Folder)?.parent || '',
        onRefreshFolder,
      )
    }
    onClose()
  }

  const handleOpenEditPropertiesDialog = () => {
    openEditNetworkPropertiesDialog(openDropdownId, onRefreshFolder)
    onClose()
  }

  const handleOpenEditFolderPropertiesDialog = () => {
    openEditFolderPropertiesDialog(openDropdownId, onRefreshFolder)
    onClose()
  }

  // Handle opening the move dialog
  const handleOpenMoveDialog = () => {
    if (onMoveItems && item) {
      // Create itemDataMap for the dialog
      const itemData = {
        name: item.name || 'Unnamed item',
        type: item.type,
        visibility: (item as any).visibility
      }

      // Open the move dialog with the current item ID
      openMoveFolderDialog(
        [openDropdownId],
        { [openDropdownId]: itemData },
        currentFolderId,
        currentFolderName,
        async () => {
          // Refresh the current folder after successful move
          if (onRefreshFolder) {
            await onRefreshFolder()
          }
          // Clear selection after successful move
          if (onClearSelection) {
            onClearSelection()
          }
        }
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
      visibility: (item.visibility as Visibility) || Visibility.PRIVATE,
    }

    openShareDialog([shareableItem], 'single', onShareSuccess)
    onClose() // Close the dropdown
  }

  const handleOpenCreateDOIDialog = () => {
    if (!item || !openDropdownId) return
    openCreateDOIDialog(openDropdownId, onRefreshFolder)
    onClose()
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

  // Handle opening network in Cytoscape Desktop
  const handleOpenInCytoscape = () => {
    if (!item || !openDropdownId) return

    // Fire and forget - close menu immediately to prevent double-clicks
    openInCytoscape(
      openDropdownId,
      item.name || 'Unnamed network',
      dropdownType || NDExFileType.NETWORK, // Pass the item type
      item.attributes || {} // Pass all attributes for shortcut resolution
    )

    onClose()
  }
  // Handle opening network in Cytoscape Web
  const handleOpenInCytoscapeWeb = () => {
    if (!item || !openDropdownId) return

    // Resolve the actual network UUID — for shortcuts, use the target; otherwise use the item's own UUID
    const targetId =
      dropdownType === NDExFileType.SHORTCUT || item.type === NDExFileType.SHORTCUT
        ? (item.attributes?.target as string) || openDropdownId
        : openDropdownId

    const baseUrl = config.cytoscapeWebUrl || 'https://web.cytoscape.org'
    window.open(`${baseUrl}/0/networks/${targetId}`, '_blank', 'noopener,noreferrer')
    onClose()
  }



  // Disabled button style helper
  const disabledClass = 'text-gray-400 cursor-not-allowed'
  const enabledClass = 'text-gray-700 hover:bg-gray-100'
  const disabledIconClass = 'text-gray-400'
  const enabledIconClass = 'text-gray-500 group-hover:text-gray-700'

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
      ) : dropdownType === NDExFileType.FOLDER && isSignedIn ? (
        // Regular folder options (signed-in only — folders have no anonymous actions)
        <div className="py-2">
          {/* Show Rename for shortcuts, Edit Properties for regular folders */}
          {item.type === NDExFileType.SHORTCUT ? (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableRenameShortcut ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableRenameShortcut ? undefined : handleButtonClick(handleOpenRenameDialog)}
              disabled={shouldDisableRenameShortcut}
            >
              <FileEdit className={`h-4 w-4 ${
                shouldDisableRenameShortcut ? disabledIconClass : enabledIconClass
              }`} />
              Rename
            </button>
          ) : (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                !canEdit ? disabledClass : enabledClass
              }`}
              onClick={!canEdit ? undefined : handleButtonClick(handleOpenEditFolderPropertiesDialog)}
              disabled={!canEdit}
            >
              <FileEdit className={`h-4 w-4 ${
                !canEdit ? disabledIconClass : enabledIconClass
              }`} />
              Edit Properties
            </button>
          )}
          <button
            className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
              shouldDisableShare ? disabledClass : enabledClass
            }`}
            onClick={shouldDisableShare ? undefined : handleButtonClick(handleOpenShareDialog)}
            disabled={shouldDisableShare}
          >
            <UserPlus className={`h-4 w-4 ${
              shouldDisableShare ? disabledIconClass : enabledIconClass
            }`} />
            Share
          </button>
          <button
            className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
              shouldDisableMove ? disabledClass : enabledClass
            }`}
            onClick={shouldDisableMove ? undefined : handleButtonClick(handleOpenMoveDialog)}
            disabled={shouldDisableMove}
          >
            <FolderInput className={`h-4 w-4 ${
              shouldDisableMove ? disabledIconClass : enabledIconClass
            }`} />
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
          {/* Only show "Move to Trash" if user is the owner */}
          {!shouldHideMoveToTrash && (
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
          )}
        </div>
      ) : hasError ? (
        // Networks with errors - only show Download and Move to Trash
        <div className="py-2">
          <DownloadMenu
            networkId={openDropdownId}
            networkName={item.name || 'network'}
            onClose={onClose}
            openToLeft={isRightAligned}
          />
          {/* Only show "Move to Trash" if user is the owner in Shared tab */}
          {!shouldHideMoveToTrash && (
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
          )}
        </div>
      ) : (
        // Regular network options (no errors)
        <div className="py-2">
          <div title={getOpenInCytoscapeTooltip()}>
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableOpenInCytoscape ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableOpenInCytoscape ? undefined : handleButtonClick(handleOpenInCytoscape)}
              disabled={shouldDisableOpenInCytoscape}
            >
              {isCytoscapeOpening ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <ExternalLink className={`h-4 w-4 ${
                  shouldDisableOpenInCytoscape ? disabledIconClass : enabledIconClass
                }`} />
              )}
              {isCytoscapeOpening ? 'Opening...' : 'Open in Cytoscape Desktop'}
            </button>
          </div>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleButtonClick(handleOpenInCytoscapeWeb)}
          >
            <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
            Open in Cytoscape Web
          </button>
          {/* Only show "Request DOI" for networks that aren't shortcuts and not in shared tab */}
          {shouldShowRequestDOI && (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableRequestDOI ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableRequestDOI ? undefined : handleButtonClick(handleOpenCreateDOIDialog)}
              disabled={shouldDisableRequestDOI}
            >
              <BookCopy className={`h-4 w-4 ${
                shouldDisableRequestDOI ? disabledIconClass : enabledIconClass
              }`} />
              Request DOI
            </button>
          )}
          <DownloadMenu
            networkId={openDropdownId}
            networkName={item.name || 'network'}
            onClose={onClose}
            openToLeft={isRightAligned}
          />
          {/* Show Rename for shortcuts, Edit Properties for regular networks (signed-in only) */}
          {isSignedIn && (item.type === NDExFileType.SHORTCUT ? (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableRenameShortcut ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableRenameShortcut ? undefined : handleButtonClick(handleOpenRenameDialog)}
              disabled={shouldDisableRenameShortcut}
            >
              <FileEdit className={`h-4 w-4 ${
                shouldDisableRenameShortcut ? disabledIconClass : enabledIconClass
              }`} />
              Rename
            </button>
          ) : (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableEditProperties ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableEditProperties ? undefined : handleButtonClick(handleOpenEditPropertiesDialog)}
              disabled={shouldDisableEditProperties}
            >
              <FileEdit className={`h-4 w-4 ${
                shouldDisableEditProperties ? disabledIconClass : enabledIconClass
              }`} />
              Edit Properties
            </button>
          ))}
          {/* Only show Make a Copy for regular networks, not shortcuts (signed-in only) */}
          {isSignedIn && item.type !== NDExFileType.SHORTCUT && (
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
          {isSignedIn && (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableShare ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableShare ? undefined : handleButtonClick(handleOpenShareDialog)}
              disabled={shouldDisableShare}
            >
              <UserPlus className={`h-4 w-4 ${
                shouldDisableShare ? disabledIconClass : enabledIconClass
              }`} />
              Share
            </button>
          )}
          {/* Only show readonly toggle for regular networks (not shortcuts) that the user owns */}
          {item.type !== NDExFileType.SHORTCUT && isOwner && (
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
          {isSignedIn && (
            <button
              className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                shouldDisableMove ? disabledClass : enabledClass
              }`}
              onClick={shouldDisableMove ? undefined : handleButtonClick(handleOpenMoveDialog)}
              disabled={shouldDisableMove}
            >
              <FolderInput className={`h-4 w-4 ${
                shouldDisableMove ? disabledIconClass : enabledIconClass
              }`} />
              Move
            </button>
          )}
          {/* Only show "Add a Shortcut" if the item is not already a shortcut (signed-in only) */}
          {isSignedIn && item.type !== NDExFileType.SHORTCUT && (
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
          {/* Only show "Move to Trash" if user is the owner */}
          {!shouldHideMoveToTrash && (
            <div title={shouldDisableMoveToTrash ? getMoveToTrashTooltip() : ""}>
              <button
                className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
                  shouldDisableMoveToTrash ? disabledClass : enabledClass
                }`}
                onClick={shouldDisableMoveToTrash ? undefined : handleButtonClick(() => {
                  onDelete([openDropdownId])
                  onClose()
                })}
                disabled={shouldDisableMoveToTrash}
              >
                <Trash2 className={`h-4 w-4 ${
                  shouldDisableMoveToTrash ? disabledIconClass : enabledIconClass
                }`} />
                Move to Trash
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActionDropdown