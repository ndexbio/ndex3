'use client'

import React, { createContext, useContext, useState } from 'react'
import RenameFolderDialog from '@/app/my-account/_components/RenameFolderDialog'
import MoveFolderDialog from '@/app/my-account/_components/MoveFolderDialog'
import EditNetworkPropertiesDialog from '@/app/my-account/_components/EditNetworkPropertiesDialog'
import EditFolderPropertiesDialog from '@/app/my-account/_components/EditFolderPropertiesDialog'
import RenameShortcutDialog from '@/app/my-account/_components/RenameShortcutDialog'
import CreateDOIDialog from '@/app/my-account/_components/CreateDOIDialog'
import ShareDialog from '@/components/dialogs/ShareDialog'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { ShareableItem } from '@/types/sharing'
import { Visibility } from '@js4cytoscape/ndex-client'

interface DialogContextType {
  openRenameFolderDialog: (
    folderId: string,
    currentName: string,
    parentFolderId: string,
    onSuccess?: () => void,
  ) => void
  openMoveFolderDialog: (
    itemsToMove: string[],
    itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>,
    currentFolderId: string | null,
    currentFolderName: string | undefined,
    onMoveComplete: () => Promise<void>,
  ) => void
  openEditNetworkPropertiesDialog: (networkId: string, onSuccess?: () => void) => void
  openEditFolderPropertiesDialog: (folderId: string, onSuccess?: () => void) => void
  openRenameShortcutDialog: (shortcutId: string, onSuccess?: () => void) => void
  openCreateDOIDialog: (networkId: string, onSuccess?: () => void) => void
  openShareDialog: (items: ShareableItem[], mode: 'single' | 'bulk', onSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void) => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const useDialogs = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialogs must be used within a DialogProvider')
  }
  return context
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Rename dialog state
  const [renameFolderDialogProps, setRenameFolderDialogProps] = useState<{
    isOpen: boolean
    folderId: string
    currentName: string
    parentFolderId: string
    onSuccess?: () => void
  }>({
    isOpen: false,
    folderId: '',
    currentName: '',
    parentFolderId: '',
  })

  // Move dialog state
  const [moveFolderDialogProps, setMoveFolderDialogProps] = useState<{
    isOpen: boolean
    itemsToMove: string[]
    itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>
    currentFolderId: string | null
    currentFolderName: string | undefined
    onMoveComplete: () => Promise<void>
  }>({
    isOpen: false,
    itemsToMove: [],
    itemDataMap: {},
    currentFolderId: null,
    currentFolderName: undefined,
    onMoveComplete: async () => {},
  })

  // Edit network properties dialog state
  const [editNetworkPropertiesDialogProps, setEditNetworkPropertiesDialogProps] = useState<{
    isOpen: boolean
    networkId: string
    network: any | null
    onSuccess?: () => void
  }>({
    isOpen: false,
    networkId: '',
    network: null,
  })

  // Edit folder properties dialog state
  const [editFolderPropertiesDialogProps, setEditFolderPropertiesDialogProps] = useState<{
    isOpen: boolean
    folderId: string
    onSuccess?: () => void
  }>({
    isOpen: false,
    folderId: '',
  })

  // Rename shortcut dialog state
  const [renameShortcutDialogProps, setRenameShortcutDialogProps] = useState<{
    isOpen: boolean
    shortcutId: string
    onSuccess?: () => void
  }>({
    isOpen: false,
    shortcutId: '',
  })

  // Share dialog state
  const [shareDialogProps, setShareDialogProps] = useState<{
    isOpen: boolean
    items: ShareableItem[]
    mode: 'single' | 'bulk'
    onSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void
  }>({
    isOpen: false,
    items: [],
    mode: 'single',
    onSuccess: undefined,
  })

  // Create DOI dialog state
  const [createDOIDialogProps, setCreateDOIDialogProps] = useState<{
    isOpen: boolean
    networkId: string
    onSuccess?: () => void
  }>({
    isOpen: false,
    networkId: '',
  })

  // Get network operation functions
  const { getNetworkSummary } = useNetworkOperation()

  const openRenameFolderDialog = (
    folderId: string,
    currentName: string,
    parentFolderId: string,
    onSuccess?: () => void,
  ) => {
    setRenameFolderDialogProps({ isOpen: true, folderId, currentName, parentFolderId, onSuccess })
  }

  const closeRenameFolderDialog = () => {
    setRenameFolderDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openMoveFolderDialog = (
    itemsToMove: string[],
    itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>,
    currentFolderId: string | null,
    currentFolderName: string | undefined,
    onMoveComplete: () => Promise<void>,
  ) => {
    setMoveFolderDialogProps({ isOpen: true, itemsToMove, itemDataMap, currentFolderId, currentFolderName, onMoveComplete })
  }

  const closeMoveFolderDialog = () => {
    setMoveFolderDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openEditNetworkPropertiesDialog = async (networkId: string, onSuccess?: () => void) => {
    try {
      const networkData = await getNetworkSummary(networkId)
      const network = {
        uuid: networkId,
        name: networkData.name || 'Untitled Network',
        description: networkData.description || '',
        type: NDExFileType.NETWORK,
        owner: networkData.owner || '',
        attributes: networkData.properties || {},
      }
      setEditNetworkPropertiesDialogProps({ isOpen: true, networkId, network, onSuccess })
    } catch (error) {
      console.error('Error fetching network summary:', error)
      setEditNetworkPropertiesDialogProps({
        isOpen: true,
        networkId,
        network: {
          uuid: networkId,
          name: 'Network',
          description: '',
          type: NDExFileType.NETWORK,
          attributes: {},
        },
        onSuccess,
      })
    }
  }

  const closeEditNetworkPropertiesDialog = () => {
    setEditNetworkPropertiesDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openEditFolderPropertiesDialog = (folderId: string, onSuccess?: () => void) => {
    setEditFolderPropertiesDialogProps({ isOpen: true, folderId, onSuccess })
  }

  const closeEditFolderPropertiesDialog = () => {
    setEditFolderPropertiesDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openRenameShortcutDialog = (shortcutId: string, onSuccess?: () => void) => {
    setRenameShortcutDialogProps({ isOpen: true, shortcutId, onSuccess })
  }

  const closeRenameShortcutDialog = () => {
    setRenameShortcutDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openShareDialog = (
    items: ShareableItem[],
    mode: 'single' | 'bulk',
    onSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void,
  ) => {
    setShareDialogProps({ isOpen: true, items, mode, onSuccess })
  }

  const closeShareDialog = () => {
    setShareDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  const openCreateDOIDialog = (networkId: string, onSuccess?: () => void) => {
    setCreateDOIDialogProps({ isOpen: true, networkId, onSuccess })
  }

  const closeCreateDOIDialog = () => {
    setCreateDOIDialogProps((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <DialogContext.Provider
      value={{
        openRenameFolderDialog,
        openMoveFolderDialog,
        openEditNetworkPropertiesDialog,
        openEditFolderPropertiesDialog,
        openRenameShortcutDialog,
        openCreateDOIDialog,
        openShareDialog,
      }}
    >
      {children}

      <RenameFolderDialog
        isOpen={renameFolderDialogProps.isOpen}
        onClose={closeRenameFolderDialog}
        folderId={renameFolderDialogProps.folderId}
        currentName={renameFolderDialogProps.currentName}
        parentFolderId={renameFolderDialogProps.parentFolderId}
        onSuccess={renameFolderDialogProps.onSuccess}
      />

      <MoveFolderDialog
        isOpen={moveFolderDialogProps.isOpen}
        onClose={closeMoveFolderDialog}
        itemsToMove={moveFolderDialogProps.itemsToMove}
        itemDataMap={moveFolderDialogProps.itemDataMap}
        currentFolderId={moveFolderDialogProps.currentFolderId}
        currentFolderName={moveFolderDialogProps.currentFolderName}
        onMoveComplete={moveFolderDialogProps.onMoveComplete}
      />

      <EditNetworkPropertiesDialog
        isOpen={editNetworkPropertiesDialogProps.isOpen}
        onClose={closeEditNetworkPropertiesDialog}
        network={editNetworkPropertiesDialogProps.network}
        onSuccess={editNetworkPropertiesDialogProps.onSuccess}
      />

      <EditFolderPropertiesDialog
        isOpen={editFolderPropertiesDialogProps.isOpen}
        onClose={closeEditFolderPropertiesDialog}
        folderId={editFolderPropertiesDialogProps.folderId}
        onSuccess={editFolderPropertiesDialogProps.onSuccess}
      />

      <RenameShortcutDialog
        isOpen={renameShortcutDialogProps.isOpen}
        onClose={closeRenameShortcutDialog}
        shortcutId={renameShortcutDialogProps.shortcutId}
        onSuccess={renameShortcutDialogProps.onSuccess}
      />

      <ShareDialog
        isOpen={shareDialogProps.isOpen}
        onClose={closeShareDialog}
        items={shareDialogProps.items}
        mode={shareDialogProps.mode}
        onSuccess={shareDialogProps.onSuccess}
      />

      <CreateDOIDialog
        isOpen={createDOIDialogProps.isOpen}
        onClose={closeCreateDOIDialog}
        networkId={createDOIDialogProps.networkId}
        onSuccess={createDOIDialogProps.onSuccess}
      />
    </DialogContext.Provider>
  )
}