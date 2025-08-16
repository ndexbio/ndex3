'use client'

import React, { createContext, useContext, useState } from 'react'
import RenameFolderDialog from '@/app/my-account/_components/RenameFolderDialog'
import MoveFolderDialog from '@/app/my-account/_components/MoveFolderDialog'
import EditNetworkPropertiesDialog from '@/app/my-account/_components/EditNetworkPropertiesDialog'
import { FileType } from '@/types/api/ndex/File'
import { useFolderContents } from '@/hooks/use-folder'
import { useNetworkOperation } from '@/hooks/use-network-operation'

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
        type: FileType.NETWORK,
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
          type: FileType.NETWORK,
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

  const handleRenameSuccess = async () => {
    // Refresh parent folder contents
    await refreshParentFolder()
  }

  const handleEditNetworkPropertiesSuccess = async () => {
    // In a real implementation, you would refresh the network properties here
    console.log('Network properties updated successfully')
  }

  return (
    <DialogContext.Provider
      value={{
        openRenameFolderDialog,
        openMoveFolderDialog,
        openEditNetworkPropertiesDialog,
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
    </DialogContext.Provider>
  )
}
