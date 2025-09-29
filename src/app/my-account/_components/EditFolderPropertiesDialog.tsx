'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useFolder } from '@/hooks/use-folder'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

interface EditFolderPropertiesDialogProps {
  isOpen: boolean
  onClose: () => void
  folderId: string | null
  onSuccess?: () => void
}

const EditFolderPropertiesDialog: React.FC<
  EditFolderPropertiesDialogProps
> = ({ isOpen, onClose, folderId, onSuccess }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [originalParentId, setOriginalParentId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Original state for change tracking
  const [originalState, setOriginalState] = useState({
    name: '',
    description: '',
  })

  // Get config and auth context
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // We'll call the NDEx client directly since the hook has incorrect signature

  // Change detection function
  const hasChanges = () => {
    return (
      name !== originalState.name ||
      description !== originalState.description
    )
  }

  // Initialize form data when the dialog opens
  useEffect(() => {
    if (isOpen && folderId && isAuthenticated) {
      // Fetch folder data using the NDEx client
      const fetchFolderData = async () => {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          const folderData = await ndexClient.files.getFolder(folderId)

          console.log('Folder data received:', folderData)

          // Set form fields from folder data
          const nameValue = folderData.name || ''
          const descriptionValue = folderData.description || ''
          const parentId = folderData.parent || null

          setName(nameValue)
          setDescription(descriptionValue)
          setOriginalParentId(parentId)

          // Store original state for change tracking
          setOriginalState({
            name: nameValue,
            description: descriptionValue,
          })
        } catch (error) {
          console.error('Error fetching folder data:', error)

          // Fallback to empty values if fetch fails
          setName('')
          setDescription('')
          setOriginalParentId(null)

          setOriginalState({
            name: '',
            description: '',
          })
        }
      }

      fetchFolderData()
    }
  }, [isOpen, folderId, isAuthenticated, config.ndexBaseUrl, token])

  // Focus the name input when the dialog opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isOpen])

  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim() || !folderId) {
      return
    }

    // Only proceed if there are changes
    if (!hasChanges()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Call the NDEx client directly to update the folder
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.updateFolder(folderId, {
        name: name,
        description: description,
        parent: originalParentId || undefined
      })

      // Update original state to reflect the new saved state
      setOriginalState({
        name,
        description,
      })

      // Refresh the folder list to show updated information
      if (onSuccess) {
        onSuccess() // This should trigger a refresh of the folder list
      }
      onClose()
    } catch (error) {
      console.error('Error updating folder properties:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !folderId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[800px] max-w-full z-10 max-h-[90vh] overflow-auto">
        <div className="px-6 py-5">
          {/* Name */}
          <div className="mb-6">
            <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Name</label>
            <input
              type="text"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={isSubmitting}
              placeholder="Folder name"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
              Description
            </label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Enter description here..."
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sky-700 hover:bg-gray-50 text-sm font-medium rounded border border-gray-200"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              className={`px-5 py-2 text-sm font-medium rounded transition-colors ${
                hasChanges() && !isSubmitting
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!hasChanges() || isSubmitting}
            >
              {isSubmitting ? 'SAVING...' : hasChanges() ? 'CONFIRM' : 'NO CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditFolderPropertiesDialog