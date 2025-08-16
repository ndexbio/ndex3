import React, { useState, useEffect } from 'react'
import { Folder, ArrowRight, X, FolderInput } from 'lucide-react'
import { FileItemBase, FileType } from '@/types/api/ndex/File'
import { useFolder, useFolderContents } from '@/hooks/use-folder'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

interface MoveFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onMove: (targetFolderId: string) => Promise<void>
  currentFolderId: string | null
  itemsToMove: string[]
}

const MoveFolderDialog: React.FC<MoveFolderDialogProps> = ({
  isOpen,
  onClose,
  onMove,
  currentFolderId,
  itemsToMove,
}) => {
  // State to track current folder being viewed in the dialog
  const [browserFolderId, setBrowserFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<
    { name: string; id: string | null }[]
  >([{ name: 'My Drive', id: null }])
  const [isMoving, setIsMoving] = useState(false)

  const { token } = useAuth()
  const config = useConfig()

  // Fetch folder contents for navigation
  const {
    items: folderContents,
    isLoading,
    error,
    refresh: refreshFolderContents,
  } = useFolderContents(browserFolderId)

  // Filter only folders from the contents
  const foldersOnly = folderContents.filter(
    (item) => item.type === FileType.FOLDER,
  )

  // Reset to home folder when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBrowserFolderId(null)
      setFolderPath([{ name: 'My Drive', id: null }])
    }
  }, [isOpen])

  // Handle navigation into a folder
  const handleNavigateInto = async (folderId: string, folderName: string) => {
    // Don't allow navigation into one of the items being moved
    if (itemsToMove.includes(folderId)) {
      return
    }

    setBrowserFolderId(folderId)
    setFolderPath([...folderPath, { name: folderName, id: folderId }])
  }

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    if (index < folderPath.length) {
      const newPath = folderPath.slice(0, index + 1)
      setFolderPath(newPath)
      setBrowserFolderId(newPath[newPath.length - 1].id)
    }
  }

  // Handle moving items to the selected folder
  const handleMoveHere = async (targetFolderId: string | null) => {
    try {
      setIsMoving(true)
      // Don't allow moving to the same folder
      if (targetFolderId === currentFolderId) {
        return
      }

      // Don't allow moving to one of the items being moved
      if (targetFolderId && itemsToMove.includes(targetFolderId)) {
        return
      }

      // Call the onMove callback with the target folder ID
      await onMove(targetFolderId || '')
      onClose()
    } catch (error) {
      console.error('Error moving items:', error)
    } finally {
      setIsMoving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Dialog Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Move items</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Breadcrumb navigation */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {folderPath.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-gray-400 mx-1">/</span>}
                <button
                  className={`text-sm hover:underline truncate max-w-[150px] ${
                    index === folderPath.length - 1
                      ? 'font-semibold text-sky-600'
                      : 'font-normal text-gray-700'
                  }`}
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Folder Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-sky-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">
              Failed to load folders. Please try again.
            </div>
          ) : foldersOnly.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No folders found in this location.
            </div>
          ) : (
            <div className="space-y-2">
              {/* List of folders to navigate into */}
              {foldersOnly.map((folder) => (
                <div
                  key={folder.uuid}
                  className={`p-3 rounded-md border border-gray-200 flex items-center justify-between ${
                    itemsToMove.includes(folder.uuid)
                      ? 'bg-gray-50 opacity-50'
                      : 'hover:bg-gray-50 group'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => handleNavigateInto(folder.uuid, folder.name)}
                  >
                    <Folder className="h-5 w-5 text-gray-600" />
                    <span className="truncate max-w-[200px]">
                      {folder.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveHere(folder.uuid)}
                      disabled={
                        isMoving ||
                        folder.uuid === currentFolderId ||
                        itemsToMove.includes(folder.uuid)
                      }
                      className={`px-3 py-1 rounded-md text-sm transition-opacity ${
                        isMoving ||
                        folder.uuid === currentFolderId ||
                        itemsToMove.includes(folder.uuid)
                          ? 'opacity-0'
                          : 'opacity-0 group-hover:opacity-100 bg-sky-600 text-white hover:bg-sky-700'
                      }`}
                    >
                      Move
                    </button>
                    <button
                      onClick={() =>
                        handleNavigateInto(folder.uuid, folder.name)
                      }
                      disabled={itemsToMove.includes(folder.uuid)}
                      className={`p-1 rounded-md transition-opacity ${
                        itemsToMove.includes(folder.uuid)
                          ? 'opacity-0'
                          : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleMoveHere(browserFolderId)}
            disabled={isMoving || browserFolderId === currentFolderId}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isMoving || browserFolderId === currentFolderId
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}

export default MoveFolderDialog
