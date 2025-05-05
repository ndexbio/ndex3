'use client'

import React, { createContext, useContext, useState } from 'react'
import RenameFolderDialog from './RenameFolderDialog'
import MoveFolderDialog from './MoveFolderDialog'
import { FileType } from '@/types/api/ndex/File'
import { useFolderContents } from '@/hooks/use-folder'

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

  const handleRenameSuccess = async () => {
    // Refresh parent folder contents
    await refreshParentFolder()
  }

  return (
    <DialogContext.Provider
      value={{
        openRenameFolderDialog,
        openMoveFolderDialog,
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
    </DialogContext.Provider>
  )
}
