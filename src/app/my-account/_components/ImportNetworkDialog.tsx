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
        className="fixed inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-card border border-border rounded-lg shadow-xl w-[500px] max-w-full z-10">
        <div className="px-6 py-5">
          <h2 className="text-xl font-normal mb-5 text-foreground">Import CX2 Network</h2>

          <div className="mb-4">
            <div className="flex flex-col gap-3">
              <label className="block text-sm font-medium text-foreground">
                Select CX2 File
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="w-full text-sm cursor-pointer text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 file:transition-colors"
                accept=".json,.cx2,.cx"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
                disabled={isSubmitting}
              />
              <span>Make network public</span>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-primary hover:bg-accent hover:text-accent-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleImportNetwork}
              className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
