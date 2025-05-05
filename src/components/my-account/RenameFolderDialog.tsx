'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useFolder, useFolderContents } from '@/hooks/use-folder'

interface RenameFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  folderId: string
  currentName: string
  parentFolderId: string
  onSuccess?: () => void
}

const RenameFolderDialog: React.FC<RenameFolderDialogProps> = ({
  isOpen,
  onClose,
  folderId,
  currentName,
  parentFolderId,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState(currentName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { updateFolder } = useFolder()
  const { refresh: refreshParentFolder } = useFolderContents(
    parentFolderId || null,
  )

  // Focus the input and select all text when the dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  // Reset folder name to current name when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFolderName(currentName)
    }
  }, [isOpen, currentName])

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameFolder()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleRenameFolder = async () => {
    if (!folderName.trim()) {
      setFolderName(currentName)
      return
    }

    // Don't do anything if the name hasn't changed
    if (folderName.trim() === currentName) {
      onClose()
      return
    }

    try {
      setIsSubmitting(true)
      await updateFolder(folderId, folderName, parentFolderId)

      // Refresh parent folder contents
      await refreshParentFolder()

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error) {
      console.error('Error renaming folder:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Completely transparent background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-white rounded-lg shadow-xl w-[400px] max-w-full z-10">
        <div className="px-6 py-5">
          <h2 className="text-xl font-normal mb-5">Rename folder</h2>

          <input
            type="text"
            ref={inputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-sky-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-4 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sky-700 hover:bg-gray-50 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleRenameFolder}
              className="px-4 py-1.5 text-sky-700 hover:bg-gray-50 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RenameFolderDialog
