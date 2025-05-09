'use client'

import React from 'react'
import { File, Folder, X } from 'lucide-react'
import { FileItemBase } from '@/types/api/ndex/File'
import { formatDate } from './NetworksList'

interface DetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: string[]
  allItems: FileItemBase[]
}

export default function DetailsPanel({
  isOpen,
  onClose,
  selectedItems,
  allItems,
}: DetailsPanelProps) {
  // Helper to determine file icon
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <Folder className="h-5 w-5 text-gray-600" />
      case 'network':
        return <File className="h-5 w-5 text-sky-700" />
      case 'network':
      default:
        return <File className="h-5 w-5 text-gray-600" />
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="w-80 h-full border border-gray-200 bg-white flex flex-col rounded-md shrink-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h3 className="font-medium">Details</h3>
        <button
          className="p-1 rounded-full hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Show empty state when no items are selected */}
      {selectedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-grow p-6 text-center">
          <div className="mb-8 relative">
            {/* Document illustration */}
            <div className="w-28 h-36 bg-blue-50 rounded-lg relative transform rotate-6 absolute -right-10 top-6 z-10"></div>
            <div className="w-24 h-32 bg-red-50 rounded-lg relative transform -rotate-12 absolute -right-2 top-14 z-0"></div>
            <div className="w-32 h-40 bg-blue-100 rounded-lg relative z-20 flex flex-col p-3">
              <div className="w-full h-2 bg-blue-300 rounded mb-2"></div>
              <div className="w-3/4 h-2 bg-blue-300 rounded mb-2"></div>
              <div className="w-full h-2 bg-blue-300 rounded mb-2"></div>
              <div className="w-2/3 h-2 bg-blue-300 rounded"></div>
            </div>
            {/* Magnifying glass */}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full z-30 flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-full">
                <div className="w-full h-full relative">
                  <div className="absolute left-3 top-3 w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="absolute left-5 top-5 w-7 h-2 bg-blue-600 transform rotate-45"></div>
                </div>
              </div>
            </div>
            {/* Green dot */}
            <div className="w-8 h-8 bg-green-500 rounded-full absolute -top-4 -left-4 z-30"></div>
          </div>
          <p className="text-gray-700 font-medium">
            Select an item to see the details
          </p>
        </div>
      )}

      {/* Show item details when one item is selected */}
      {selectedItems.length === 1 && (
        <div className="p-4">
          <div className="flex items-center justify-center h-40 w-full bg-gray-100 rounded mb-4">
            {getItemIcon(
              allItems.find((item) => item.uuid === selectedItems[0])?.type ||
                'file',
            )}
          </div>

          <h4 className="text-lg font-medium mb-1">
            {allItems.find((item) => item.uuid === selectedItems[0])?.name ||
              'Untitled'}
          </h4>

          <div className="space-y-4">
            <div>
              <h4 className="text-base font-medium text-gray-500 mb-1">
                Details
              </h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">UUID</span>
                  <span className="text-xs truncate max-w-[150px]">
                    {selectedItems[0]}
                  </span>
                </div>

                {/* Additional details will vary based on fetch from APIs */}
                {(() => {
                  const selectedItem = allItems.find(
                    (item) => item.uuid === selectedItems[0],
                  )
                  if (selectedItem?.type === 'NETWORK') {
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type</span>
                          <span>Network</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Edge Count</span>
                          <span>{selectedItem.attributes?.edges ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Visibility</span>
                          <span>
                            {selectedItem.attributes?.visibility ?? 'N/A'}
                          </span>
                        </div>
                        <h4 className="text-base font-medium text-gray-500 mb-1 mt-2">
                          Description
                        </h4>
                        <p className="text-sm text-gray-700">
                          {selectedItem.attributes?.description ??
                            'No description available.'}
                        </p>
                      </>
                    )
                  } else if (selectedItem?.type === 'FOLDER') {
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type</span>
                          <span>Folder</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Modified</span>
                          <span>
                            {formatDate(selectedItem.modificationTime) ?? 'N/A'}
                          </span>
                        </div>
                      </>
                    )
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show multiple items selection UI */}
      {selectedItems.length > 1 && (
        <div className="p-4">
          <p className="text-lg font-medium mb-4">
            {selectedItems.length} items selected
          </p>
          <ul className="space-y-2 text-sm max-h-[400px] overflow-y-auto">
            {selectedItems.map((uuid) => {
              const item = allItems.find((item) => item.uuid === uuid)
              return (
                <li key={uuid} className="flex items-center gap-2">
                  {getItemIcon(item?.type || 'file')}
                  <span className="truncate">{item?.name || 'Untitled'}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
