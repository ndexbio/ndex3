'use client'

import React, { useState, useRef, useEffect } from 'react'

interface NewFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolder: (name: string) => Promise<void>
  defaultName?: string
}

const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  defaultName = 'Untitled folder',
}) => {
  const [folderName, setFolderName] = useState(defaultName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input and select all text when the dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  // Reset folder name to default when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFolderName(defaultName)
    }
  }, [isOpen, defaultName])

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setFolderName(defaultName)
      return
    }

    try {
      setIsSubmitting(true)
      await onCreateFolder(folderName)
      onClose()
    } catch (error) {
      console.error('Error creating folder:', error)
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
          <h2 className="text-xl font-normal mb-5">New folder</h2>

          <input
            type="text"
            ref={inputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-blue-500 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isSubmitting}
          />

          <div className="flex justify-end gap-4 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-blue-600 hover:bg-gray-50 text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              className="px-4 py-1.5 text-blue-600 hover:bg-gray-50 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewFolderDialog
