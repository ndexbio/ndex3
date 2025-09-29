'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

interface RenameShortcutDialogProps {
  isOpen: boolean
  onClose: () => void
  shortcutId: string | null
  onSuccess?: () => void
}

const RenameShortcutDialog: React.FC<RenameShortcutDialogProps> = ({
  isOpen,
  onClose,
  shortcutId,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [originalName, setOriginalName] = useState('')
  const [shortcutData, setShortcutData] = useState<any>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Get config and auth context
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  // Change detection function
  const hasChanges = () => {
    return name.trim() !== originalName && name.trim() !== ''
  }

  // Initialize form data when the dialog opens
  useEffect(() => {
    if (isOpen && shortcutId && isAuthenticated) {
      // Fetch shortcut data using the NDEx client
      const fetchShortcutData = async () => {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          const shortcut = await ndexClient.files.getShortcut(shortcutId)

          console.log('Shortcut data received:', shortcut)

          // Set form fields from shortcut data
          const nameValue = shortcut.name || ''

          setName(nameValue)
          setOriginalName(nameValue)
          setShortcutData(shortcut)
        } catch (error) {
          console.error('Error fetching shortcut data:', error)

          // Fallback to empty values if fetch fails
          setName('')
          setOriginalName('')
          setShortcutData(null)
        }
      }

      fetchShortcutData()
    }
  }, [isOpen, shortcutId, isAuthenticated, config.ndexBaseUrl, token])

  // Focus the name input when the dialog opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select() // Select all text for easy editing
    }
  }, [isOpen])

  // Handle form submission
  const handleSubmit = async () => {
    const trimmedName = name.trim()

    if (!trimmedName || !shortcutId || !shortcutData) {
      return
    }

    // Only proceed if there are changes
    if (!hasChanges()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Call the NDEx client to update the shortcut
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.files.updateShortcut(shortcutId, {
        name: trimmedName,
        target: shortcutData.target,
        targetType: shortcutData.targetType,
        parent: shortcutData.parent
      })

      // Update original name to reflect the new saved state
      setOriginalName(trimmedName)

      // Refresh the list to show updated information
      if (onSuccess) {
        onSuccess() // This should trigger a refresh of the folder/network list
      }
      onClose()
    } catch (error) {
      console.error('Error renaming shortcut:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges() && !isSubmitting) {
      handleSubmit()
    }
  }

  if (!isOpen || !shortcutId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[500px] max-w-full z-10">
        <div className="px-6 py-5">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">
            Rename Shortcut
          </h3>

          {/* Name input */}
          <div className="mb-6">
            <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={isSubmitting}
              placeholder="Enter shortcut name"
            />
            {name.trim() === '' && (
              <p className="text-red-500 text-xs mt-1">Name cannot be empty</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                hasChanges() && !isSubmitting
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges() || isSubmitting}
            >
              {isSubmitting ? 'Renaming...' : hasChanges() ? 'Rename' : 'No Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RenameShortcutDialog