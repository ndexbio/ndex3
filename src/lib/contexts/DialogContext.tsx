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
import { useFolderContents } from '@/hooks/use-folder'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { ShareableItem } from '@/types/sharing'
import { Visibility } from '@js4cytoscape/ndex-client'

interface DialogContextType {
  openRenameFolderDialog: (
    folderId: string,
    currentName: string,
    parentFolderId: string,
  ) => void
  openMoveFolderDialog: (
    itemsToMove: string[],
    currentFolderId: string | null,
    onMove: (targetFolderId: string) => Promise<void>,
  ) => void
  openEditNetworkPropertiesDialog: (networkId: string) => void
  openEditFolderPropertiesDialog: (folderId: string) => void
  openRenameShortcutDialog: (shortcutId: string) => void
  openCreateDOIDialog: (networkId: string) => void
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
    currentFolderId: string | null
    onMove: (targetFolderId: string) => Promise<void>
  }>({
    isOpen: false,
    itemsToMove: [],
    currentFolderId: null,
    onMove: async () => {},
  })

  // Edit network properties dialog state
  const [
    editNetworkPropertiesDialogProps,
    setEditNetworkPropertiesDialogProps,
  ] = useState<{
    isOpen: boolean
    networkId: string
    network: any | null
  }>({
    isOpen: false,
    networkId: '',
    network: null,
  })

  // Edit folder properties dialog state
  const [
    editFolderPropertiesDialogProps,
    setEditFolderPropertiesDialogProps,
  ] = useState<{
    isOpen: boolean
    folderId: string
  }>({
    isOpen: false,
    folderId: '',
  })

  // Rename shortcut dialog state
  const [
    renameShortcutDialogProps,
    setRenameShortcutDialogProps,
  ] = useState<{
    isOpen: boolean
    shortcutId: string
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
  }>({
    isOpen: false,
    networkId: '',
  })

  // Get network operation functions (no specific network ID)
  const { getNetworkSummary } = useNetworkOperation()

  // Get refresh function for parent folder
  const { refresh: refreshParentFolder } = useFolderContents(
    renameFolderDialogProps.isOpen
      ? renameFolderDialogProps.parentFolderId || null
      : null,
  )

  const openRenameFolderDialog = (
    folderId: string,
    currentName: string,
    parentFolderId: string,
  ) => {
    setRenameFolderDialogProps({
      isOpen: true,
      folderId,
      currentName,
      parentFolderId,
    })
  }

  const closeRenameFolderDialog = () => {
    setRenameFolderDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openMoveFolderDialog = (
    itemsToMove: string[],
    currentFolderId: string | null,
    onMove: (targetFolderId: string) => Promise<void>,
  ) => {
    setMoveFolderDialogProps({
      isOpen: true,
      itemsToMove,
      currentFolderId,
      onMove,
    })
  }

  const closeMoveFolderDialog = () => {
    setMoveFolderDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openEditNetworkPropertiesDialog = async (networkId: string) => {
    try {
      // Fetch the network summary data using the new function
      const networkData = await getNetworkSummary(networkId)

      // Map the returned network summary to our network object structure
      const network = {
        uuid: networkId,
        name: networkData.name || 'Untitled Network',
        description: networkData.description || '',
        type: NDExFileType.NETWORK,
        owner: networkData.owner || '',
        attributes: networkData.properties || {},
        // Add any other needed properties from the response
      }

      setEditNetworkPropertiesDialogProps({
        isOpen: true,
        networkId,
        network,
      })
    } catch (error) {
      console.error('Error fetching network summary:', error)

      // Fallback to a basic object if fetch fails
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
      })
    }
  }

  const closeEditNetworkPropertiesDialog = () => {
    setEditNetworkPropertiesDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openEditFolderPropertiesDialog = (folderId: string) => {
    setEditFolderPropertiesDialogProps({
      isOpen: true,
      folderId,
    })
  }

  const closeEditFolderPropertiesDialog = () => {
    setEditFolderPropertiesDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openRenameShortcutDialog = (shortcutId: string) => {
    setRenameShortcutDialogProps({
      isOpen: true,
      shortcutId,
    })
  }

  const closeRenameShortcutDialog = () => {
    setRenameShortcutDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const handleRenameSuccess = async () => {
    // Refresh parent folder contents
    await refreshParentFolder()
  }

  const handleEditNetworkPropertiesSuccess = async () => {
    // Refresh the parent folder contents to show updated network information
    await refreshParentFolder()
  }

  const handleEditFolderPropertiesSuccess = async () => {
    // Refresh the parent folder contents to show updated folder information
    await refreshParentFolder()
  }

  const handleRenameShortcutSuccess = async () => {
    // Refresh the parent folder contents to show updated shortcut information
    await refreshParentFolder()
  }

  const openShareDialog = (items: ShareableItem[], mode: 'single' | 'bulk', onSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void) => {
    setShareDialogProps({
      isOpen: true,
      items,
      mode,
      onSuccess,
    })
  }

  const closeShareDialog = () => {
    setShareDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const openCreateDOIDialog = (networkId: string) => {
    setCreateDOIDialogProps({
      isOpen: true,
      networkId,
    })
  }

  const closeCreateDOIDialog = () => {
    setCreateDOIDialogProps((prev) => ({
      ...prev,
      isOpen: false,
    }))
  }

  const handleCreateDOISuccess = async () => {
    // Refresh the parent folder contents to show updated network status
    await refreshParentFolder()
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

      {/* Render dialogs outside of normal component flow */}
      <RenameFolderDialog
        isOpen={renameFolderDialogProps.isOpen}
        onClose={closeRenameFolderDialog}
        folderId={renameFolderDialogProps.folderId}
        currentName={renameFolderDialogProps.currentName}
        parentFolderId={renameFolderDialogProps.parentFolderId}
        onSuccess={handleRenameSuccess}
      />

      <MoveFolderDialog
        isOpen={moveFolderDialogProps.isOpen}
        onClose={closeMoveFolderDialog}
        itemsToMove={moveFolderDialogProps.itemsToMove}
        currentFolderId={moveFolderDialogProps.currentFolderId}
        onMove={moveFolderDialogProps.onMove}
      />

      <EditNetworkPropertiesDialog
        isOpen={editNetworkPropertiesDialogProps.isOpen}
        onClose={closeEditNetworkPropertiesDialog}
        network={editNetworkPropertiesDialogProps.network}
        onSuccess={handleEditNetworkPropertiesSuccess}
      />

      <EditFolderPropertiesDialog
        isOpen={editFolderPropertiesDialogProps.isOpen}
        onClose={closeEditFolderPropertiesDialog}
        folderId={editFolderPropertiesDialogProps.folderId}
        onSuccess={handleEditFolderPropertiesSuccess}
      />

      <RenameShortcutDialog
        isOpen={renameShortcutDialogProps.isOpen}
        onClose={closeRenameShortcutDialog}
        shortcutId={renameShortcutDialogProps.shortcutId}
        onSuccess={handleRenameShortcutSuccess}
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
        onSuccess={handleCreateDOISuccess}
      />
    </DialogContext.Provider>
  )
}
