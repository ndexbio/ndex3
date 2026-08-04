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
import { useToast } from '@/lib/contexts/ToastContext'
import { hasNetworkError, hasValidDOI as hasValidNetworkDOI, isNetworkReadOnly } from '@/lib/utils/network-status'
import { isItemOwner } from '@/lib/utils/permissions'
import { resolveNetworkTarget, targetsFolder } from '@/lib/utils/shortcut-resolver'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useConfig } from '@/lib/contexts/ConfigContext'
import MenuItemButton from '@/components/shared/MenuItemButton'
import { withAccessKey } from '@/lib/utils/access-key'

/** Tooltip shown on edit actions greyed out for anonymous viewers. */
const SIGN_IN_TOOLTIP = 'Sign in to use this feature'

// Add a dropdown menu for download formats.
// Downloads always operate on the resolved TARGET network — for shortcut rows
// the shortcut chain is resolved first, so the shortcut's own UUID is never
// sent to the network endpoints.
const DownloadMenu: React.FC<{
  itemId: string
  item: FileItemBase
  onClose: () => void
  openToLeft?: boolean
  /** Access key from the folder URL — cascades READ to contained networks. */
  urlAccessKey?: string
}> = ({ itemId, item, onClose, openToLeft, urlAccessKey }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloadingItem, setIsDownloadingItem] = useState(false)
  const { downloadNetwork } = useNetworkDownload()
  const { addToast } = useToast()
  const config = useConfig()
  const { token } = useAuth()

  const handleDownload = async (format: 'CX' | 'CX2') => {
    if (isDownloadingItem) return
    setIsDownloadingItem(true)

    try {
      const { networkId, accessKey } = await resolveNetworkTarget(
        itemId,
        item.type,
        item.attributes,
        { ndexBaseUrl: config.ndexBaseUrl, token, accessKey: urlAccessKey },
      )
      await downloadNetwork(
        networkId,
        item.name || `network_${networkId}`,
        { format },
        accessKey ?? urlAccessKey,
      )
    } catch (error) {
      addToast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        type: 'error',
        duration: 6000,
      })
    } finally {
      setIsDownloadingItem(false)
      setIsOpen(false)
      onClose()
    }
  }

  return (
    <div className="relative">
      <button
        className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        disabled={isDownloadingItem}
      >
        <Download className="h-4 w-4 text-gray-500 group-hover:text-gray-700" />
        {isDownloadingItem ? (
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
            disabled={isDownloadingItem}
          >
            <span>CX Format</span>
          </button>
          <button
            className="group flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload('CX2')
            }}
            disabled={isDownloadingItem}
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
  /** Whether the viewer owns the folder being viewed (drives Add Shortcut target etc.). */
  canEditFolder?: boolean
  /** Access key from the folder URL — READ bypass cascading to folder contents. */
  accessKey?: string
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

/**
 * ActionDropdown
 *
 * Per-item "⋯" menu. What it offers is decided by three inputs (see
 * docs/folder-viewing-feature.md):
 *  - viewer class: anonymous viewers get READ actions only — edit actions are
 *    greyed out (never hidden) with a sign-in tooltip
 *  - per-item permission: owner → everything; WRITE permission → edit-level
 *    actions; otherwise read-only
 *  - item type: Download / Open in Cytoscape are NETWORK actions — folder rows
 *    and shortcuts-to-folders never see them; shortcut rows resolve these
 *    actions against the shortcut's TARGET network
 */
const ActionDropdown: React.FC<ActionDropdownProps> = ({
  openDropdownId,
  dropdownType,
  item,
  tabState,
  currentFolderId,
  currentFolderName,
  canEditFolder = true,
  accessKey,
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
  const { user, isAuthenticated: isSignedIn, token } = useAuth()
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
  const { addToast } = useToast()
  const config = useConfig()

  // Check DOI, readonly status, and error status for networks
  const hasDOI = dropdownType === NDExFileType.NETWORK && hasValidDOI(item)
  const isReadOnly = dropdownType === NDExFileType.NETWORK && isReadOnlyNetwork(item)
  const hasError = dropdownType === NDExFileType.NETWORK && networkHasError(item)

  // Check if the current user is the owner
  const isOwner = isItemOwner(item, user)

  // Check permission - in Shared tab, user needs WRITE permission to edit
  const hasWritePermission = item?.permission === Permission.WRITE

  // Can the user edit this item? (owner or has write permission)
  // Anonymous viewers can never edit — their actions are greyed out below.
  const canEdit = isSignedIn && (isOwner || hasWritePermission)

  // Anonymous edit actions: visible but disabled, with a sign-in hint
  const anonymous = !isSignedIn
  const editTooltip = anonymous ? SIGN_IN_TOOLTIP : undefined

  // Determine when to show Request DOI button (owner-only, networks only, not shortcuts)
  const shouldShowRequestDOI =
    dropdownType === NDExFileType.NETWORK &&
    item?.type !== NDExFileType.SHORTCUT &&
    isOwner

  // Determine which menu items should be disabled
  const shouldDisableRequestDOI = hasDOI
  const shouldDisableEditProperties = hasDOI || isReadOnly || !canEdit
  const shouldDisableRenameShortcut = !canEdit
  const shouldDisableShare = !canEdit
  const shouldDisableMoveToTrash = hasDOI || isReadOnly || !isOwner
  const shouldDisableMove = !canEdit

  // Hide Move to Trash only for signed-in non-owners (existing behavior);
  // anonymous viewers see it greyed out like every other edit action.
  const shouldHideMoveToTrash = isSignedIn && !isOwner

  // Tooltip messages for disabled items
  const getMoveToTrashTooltip = (): string | undefined => {
    if (anonymous) return SIGN_IN_TOOLTIP
    if (hasDOI) return "Networks with DOI can't be deleted"
    if (isReadOnly) return "Read-only networks can't be deleted"
    return undefined
  }

  // "Open in Cytoscape Desktop" is only enabled when Cytoscape Desktop is running
  // and reachable (CyNDEx-2 responding on localhost). Disabled while we're still
  // probing or when it can't be reached.
  const isCytoscapeOpening = openDropdownId ? isOpening[openDropdownId] : false
  const shouldDisableOpenInCytoscape =
    isCytoscapeOpening || isCheckingCytoscape || !isCytoscapeAvailable

  const getOpenInCytoscapeTooltip = (): string | undefined => {
    if (isCytoscapeOpening) return undefined
    if (isCheckingCytoscape) return 'Checking for Cytoscape Desktop…'
    if (!isCytoscapeAvailable) {
      return 'Cannot connect to Cytoscape. Please make sure Cytoscape Desktop is installed and running (with the CyNDEx-2 app), then try again.'
    }
    return undefined
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

  // Folder-behaving rows (folders and shortcuts-to-folders) get the folder
  // menu for EVERY viewer — network actions (Download / Open in Cytoscape)
  // must never appear on them.
  const isFolderRow = dropdownType === NDExFileType.FOLDER || targetsFolder(item)

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
  const dropdownHeight = isFolderRow ? 240 : dropdownType === NDExFileType.NETWORK ? 340 : 40

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
        visibility: item.visibility as Visibility,
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

    // Copy into the folder being viewed when the viewer owns it; otherwise
    // into the viewer's own home folder (null = home).
    const parentFolderId = canEditFolder ? currentFolderId : null

    await copyFile(
      openDropdownId,
      item.name || 'Unnamed file',
      dropdownType || NDExFileType.NETWORK,
      parentFolderId,
      accessKey,
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
      item.attributes || {}, // Pass all attributes for shortcut resolution
      accessKey,
    )

    onClose()
  }

  // Redirects to the Cytoscape Web sibling app (config.cytoscapeWebUrl) with
  // the TARGET network's UUID — shortcut chains are resolved first via the
  // shared resolver (same one used by Download and Open in Cytoscape Desktop).
  const handleOpenInCytoscapeWeb = async () => {
    if (!item || !openDropdownId) return
    onClose()

    try {
      const { networkId, accessKey: resolvedAccessKey } = await resolveNetworkTarget(
        openDropdownId,
        item.type,
        item.attributes,
        { ndexBaseUrl: config.ndexBaseUrl, token, accessKey },
      )
      const baseUrl = config.cytoscapeWebUrl || 'https://web.cytoscape.org'
      const url = withAccessKey(
        `${baseUrl.replace(/\/$/, '')}/0/networks/${networkId}`,
        resolvedAccessKey ?? accessKey,
      )
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      addToast({
        title: 'Failed to open network in Cytoscape Web',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        type: 'error',
        duration: 6000,
      })
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
          <MenuItemButton
            icon={History}
            label="Restore"
            onClick={() => {
              if (onRestore) onRestore([openDropdownId])
              onClose()
            }}
          />
          <MenuItemButton
            icon={Trash2}
            label="Delete permanently"
            danger
            onClick={() => {
              onDelete([openDropdownId])
              onClose()
            }}
          />
        </div>
      ) : isFolderRow ? (
        // Folder / shortcut-to-folder menu — same items for every viewer;
        // edit actions greyed out for anonymous and read-only viewers.
        // Never offers Download / Open in Cytoscape (network-only actions).
        <div className="py-2">
          {/* Show Rename for shortcuts, Edit Properties for regular folders */}
          {item.type === NDExFileType.SHORTCUT ? (
            <MenuItemButton
              icon={FileEdit}
              label="Rename"
              onClick={handleOpenRenameDialog}
              disabled={shouldDisableRenameShortcut}
              disabledTooltip={editTooltip}
            />
          ) : (
            <MenuItemButton
              icon={FileEdit}
              label="Edit Properties"
              onClick={handleOpenEditFolderPropertiesDialog}
              disabled={!canEdit}
              disabledTooltip={editTooltip}
            />
          )}
          <MenuItemButton
            icon={UserPlus}
            label="Share"
            onClick={handleOpenShareDialog}
            disabled={shouldDisableShare}
            disabledTooltip={editTooltip}
          />
          <MenuItemButton
            icon={FolderInput}
            label="Move"
            onClick={handleOpenMoveDialog}
            disabled={shouldDisableMove}
            disabledTooltip={editTooltip}
          />
          {/* Only show "Add Shortcut" if the item is not already a shortcut */}
          {item.type !== NDExFileType.SHORTCUT && (
            <MenuItemButton
              icon={FileSymlink}
              label="Add Shortcut"
              onClick={() => {
                onCreateShortcut(openDropdownId)
                onClose()
              }}
              disabled={anonymous}
              disabledTooltip={editTooltip}
            />
          )}
          {/* Move to Trash: hidden for signed-in non-owners, greyed for anonymous */}
          {!shouldHideMoveToTrash && (
            <MenuItemButton
              icon={Trash2}
              label="Move to Trash"
              onClick={() => {
                onDelete([openDropdownId])
                onClose()
              }}
              disabled={shouldDisableMoveToTrash}
              disabledTooltip={getMoveToTrashTooltip()}
            />
          )}
        </div>
      ) : hasError ? (
        // Networks with errors - only show Download and Move to Trash
        <div className="py-2">
          <DownloadMenu
            itemId={openDropdownId}
            item={item}
            onClose={onClose}
            openToLeft={isRightAligned}
            urlAccessKey={accessKey}
          />
          {!shouldHideMoveToTrash && (
            <MenuItemButton
              icon={Trash2}
              label="Move to Trash"
              onClick={() => {
                onDelete([openDropdownId])
                onClose()
              }}
              disabled={anonymous}
              disabledTooltip={editTooltip}
            />
          )}
        </div>
      ) : (
        // Network / shortcut-to-network menu (no errors).
        // READ actions (Open in Cytoscape, Download) available to everyone the
        // server showed the item to; edit actions greyed for non-editors.
        <div className="py-2">
          <MenuItemButton
            icon={isCytoscapeOpening ? Loader2 : ExternalLink}
            label="Open in Cytoscape Desktop"
            busy={isCytoscapeOpening}
            busyLabel="Opening..."
            onClick={handleOpenInCytoscape}
            disabled={shouldDisableOpenInCytoscape}
            disabledTooltip={getOpenInCytoscapeTooltip()}
          />
          <MenuItemButton
            icon={ExternalLink}
            label="Open in Cytoscape Web"
            onClick={handleOpenInCytoscapeWeb}
          />
          {/* Only show "Request DOI" for networks that aren't shortcuts and owned by the viewer */}
          {shouldShowRequestDOI && (
            <MenuItemButton
              icon={BookCopy}
              label="Request DOI"
              onClick={handleOpenCreateDOIDialog}
              disabled={shouldDisableRequestDOI}
            />
          )}
          <DownloadMenu
            itemId={openDropdownId}
            item={item}
            onClose={onClose}
            openToLeft={isRightAligned}
            urlAccessKey={accessKey}
          />
          {/* Show Rename for shortcuts, Edit Properties for regular networks */}
          {item.type === NDExFileType.SHORTCUT ? (
            <MenuItemButton
              icon={FileEdit}
              label="Rename"
              onClick={handleOpenRenameDialog}
              disabled={shouldDisableRenameShortcut}
              disabledTooltip={editTooltip}
            />
          ) : (
            <MenuItemButton
              icon={FileEdit}
              label="Edit Properties"
              onClick={handleOpenEditPropertiesDialog}
              disabled={shouldDisableEditProperties}
              disabledTooltip={editTooltip}
            />
          )}
          {/* Make a Copy writes into the VIEWER's account — any signed-in user may copy */}
          {item.type !== NDExFileType.SHORTCUT && (
            <MenuItemButton
              icon={Copy}
              label="Make a Copy"
              busy={isCopying[openDropdownId]}
              busyLabel="Copying..."
              onClick={handleCopyFile}
              disabled={anonymous}
              disabledTooltip={editTooltip}
            />
          )}
          <MenuItemButton
            icon={UserPlus}
            label="Share"
            onClick={handleOpenShareDialog}
            disabled={shouldDisableShare}
            disabledTooltip={editTooltip}
          />
          {/* Only show readonly toggle for regular networks (not shortcuts) that the user owns */}
          {item.type !== NDExFileType.SHORTCUT && isOwner && (
            <MenuItemButton
              icon={isReadOnly ? LockOpen : Lock}
              label={isReadOnly ? 'Remove Read-only' : 'Set as Read-only'}
              busy={isUpdating[openDropdownId]}
              busyLabel="Updating..."
              onClick={handleToggleReadOnly}
            />
          )}
          <MenuItemButton
            icon={FolderInput}
            label="Move"
            onClick={handleOpenMoveDialog}
            disabled={shouldDisableMove}
            disabledTooltip={editTooltip}
          />
          {/* Only show "Add a Shortcut" if the item is not already a shortcut */}
          {item.type !== NDExFileType.SHORTCUT && (
            <MenuItemButton
              icon={FileSymlink}
              label="Add a Shortcut"
              onClick={() => {
                onCreateShortcut(openDropdownId)
                onClose()
              }}
              disabled={anonymous}
              disabledTooltip={editTooltip}
            />
          )}
          {/* Move to Trash: hidden for signed-in non-owners, greyed for anonymous */}
          {!shouldHideMoveToTrash && (
            <MenuItemButton
              icon={Trash2}
              label="Move to Trash"
              onClick={() => {
                onDelete([openDropdownId])
                onClose()
              }}
              disabled={shouldDisableMoveToTrash}
              disabledTooltip={getMoveToTrashTooltip()}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ActionDropdown
