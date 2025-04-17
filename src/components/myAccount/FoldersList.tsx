'use client'

import React from 'react'
import { Folder, MoreVertical, Clock, User, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FolderItemBase } from '@/hooks/use-folder-contents'

// Props for the component
interface FoldersListProps {
  folders: FolderItemBase[]
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  onSelect: (event: React.MouseEvent, id: string, index: number) => void
  currentFolderId: string | null
}

// Extended folder item with additional properties we might have
interface FolderItem extends FolderItemBase {
  owner?: string
  modificationTime?: string | Date
  creationTime?: string | Date
  description?: string
  itemCount?: number
}

const FoldersList: React.FC<FoldersListProps> = ({
  folders,
  viewMode,
  selectedItems,
  onSelect,
  currentFolderId,
}) => {
  const router = useRouter()

  // Helper to determine folder icon
  const getFolderIcon = () => {
    return <Folder className="h-5 w-5 text-gray-600" />
  }

  // Format date in a readable way
  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return 'N/A'
    const date =
      typeof dateStr === 'string'
        ? dateStr
        : new Date(dateStr).toLocaleDateString()
    return date
  }

  // Format count with commas for readability
  const formatCount = (count?: number) => {
    if (count === undefined || count === null) return 'N/A'
    return count.toLocaleString()
  }

  // Handle double click on folder to navigate into it
  const handleFolderDoubleClick = (
    event: React.MouseEvent,
    folderId: string,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    // Navigate to the folder view
    router.push(`/folder/${folderId}`)
  }

  // Handle item click with proper event passing
  const handleItemClick = (
    event: React.MouseEvent,
    id: string,
    index: number,
  ) => {
    onSelect(event, id, index)
  }

  // Filter out network items - this component only shows folders
  const folderItems = folders.filter(
    (item) => item.type === 'FOLDER',
  ) as FolderItem[]

  if (folderItems.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>
        <p className="text-sm text-gray-500">No folders found</p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-500 mb-2">Folders</h2>

      {viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {folderItems.map((folder, index) => (
            <div
              key={folder.uuid}
              data-item
              className={`
                rounded-md border border-gray-200 cursor-pointer select-none
                p-2 flex items-center justify-between
                ${
                  selectedItems.includes(folder.uuid)
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-50'
                }
              `}
              onClick={(e) => handleItemClick(e, folder.uuid, index)}
              onDoubleClick={(e) => handleFolderDoubleClick(e, folder.uuid)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0">{getFolderIcon()}</div>
                <span className="text-sm truncate">{folder.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-1 rounded-full hover:bg-gray-200">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View - Enhanced with table layout
        <div className="overflow-x-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5"
                >
                  Owner
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5"
                >
                  Modified
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {folderItems.map((folder, index) => (
                <tr
                  key={folder.uuid}
                  data-item
                  className={`cursor-pointer ${
                    selectedItems.includes(folder.uuid)
                      ? 'bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={(e) => handleItemClick(e, folder.uuid, index)}
                  onDoubleClick={(e) => handleFolderDoubleClick(e, folder.uuid)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center max-w-full">
                      <div className="flex-shrink-0 mr-3">
                        {getFolderIcon()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
                          {folder.name}
                        </div>
                        {folder.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[250px]">
                            {folder.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="truncate">{folder.owner || 'You'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(folder.modificationTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(folder.creationTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        className="p-1 rounded-full hover:bg-gray-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFolderDoubleClick(e, folder.uuid)
                        }}
                        title="Open folder"
                      >
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="p-1 rounded-full hover:bg-gray-200">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FoldersList
