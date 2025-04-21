'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ImportNetworkDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportNetwork: (file: File, makePublic: boolean) => Promise<void>
}

const ImportNetworkDialog: React.FC<ImportNetworkDialogProps> = ({
  isOpen,
  onClose,
  onImportNetwork,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null)
      setIsPublic(false)
      setErrorMessage('')
    }
  }, [isOpen])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  // Handle Escape key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleImportNetwork = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a CX2 file to import')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')
      await onImportNetwork(selectedFile, isPublic)
      onClose()
    } catch (error) {
      console.error('Error importing network:', error)
      setErrorMessage('Failed to import network. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-full z-10">
        <div className="px-6 py-5">
          <h2 className="text-xl font-normal mb-5">Import CX2 Network</h2>

          <div className="mb-4">
            <div className="flex flex-col gap-3">
              <label className="block text-sm font-medium text-gray-700">
                Select CX2 File
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                accept=".json,.cx2,.cx"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-sky-800 focus:ring-sky-800 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <span>Make network public</span>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sky-700 hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleImportNetwork}
              className="px-4 py-1.5 bg-sky-700 text-white hover:bg-sky-800 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !selectedFile}
            >
              {isSubmitting ? 'Importing...' : 'Import Network'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportNetworkDialog
