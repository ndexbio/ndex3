'use client'

import React, { useEffect, useState } from 'react'
import { File, Folder, X, Link, Loader2, GripVertical } from 'lucide-react'
import { FileItemBase } from '@/types/api/ndex/File'
import { formatDate } from './NetworksList'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { Folder as FolderType } from '@/hooks/use-folder'
import { Shortcut } from '@/hooks/use-shortcut'
import { NetworkSummaryV2, NDExFileType } from '@js4cytoscape/ndex-client'

interface DetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: string[]
  allItems: FileItemBase[]
  width?: number
  isDragging?: boolean
  onMouseDownResize?: (e: React.MouseEvent) => void
}

interface DetailedItemData {
  folder?: FolderType
  network?: NetworkSummaryV2
  shortcut?: Shortcut
  isLoading: boolean
  error?: string
}

export default function DetailsPanel({
  isOpen,
  onClose,
  selectedItems,
  allItems,
  width = 320,
  isDragging = false,
  onMouseDownResize,
}: DetailsPanelProps) {
  const config = useConfig()
  const { token } = useAuth()
  const [detailedData, setDetailedData] = useState<DetailedItemData>({ isLoading: false })

  // Helper to determine file icon
  const getItemIcon = (type: string, size: 'small' | 'medium' = 'small') => {
    const iconSize = size === 'small' ? 'h-4 w-4' : 'h-6 w-6'
    
    switch (type) {
      case NDExFileType.FOLDER:
        return <Folder className={`${iconSize} text-blue-600`} />
      case NDExFileType.NETWORK:
        return <File className={`${iconSize} text-sky-700`} />
      case NDExFileType.SHORTCUT:
        return <Link className={`${iconSize} text-purple-600`} />
      default:
        return <File className={`${iconSize} text-muted-foreground`} />
    }
  }

  // Fetch detailed data when a single item is selected
  useEffect(() => {
    if (selectedItems.length === 1) {
      const selectedUuid = selectedItems[0]
      const selectedItem = allItems.find(item => item.uuid === selectedUuid)
      
      if (!selectedItem) return

      setDetailedData({ isLoading: true })

      const fetchDetailedData = async () => {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          
          if (selectedItem.type === NDExFileType.FOLDER) {
            const folder = await ndexClient.files.getFolder(selectedUuid)
            setDetailedData({ folder, isLoading: false })
          } else if (selectedItem.type === NDExFileType.NETWORK) {
            const network = await ndexClient.networks.v2.getNetworkSummary(selectedUuid)
            setDetailedData({ network, isLoading: false })
          } else if (selectedItem.type === NDExFileType.SHORTCUT) {
            const shortcut = await ndexClient.files.getShortcut(selectedUuid)
            setDetailedData({ shortcut, isLoading: false })
          } else {
            setDetailedData({ isLoading: false })
          }
        } catch (error) {
          console.error('Error fetching detailed data:', error)
          setDetailedData({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load details'
          })
        }
      }

      fetchDetailedData()
    } else {
      setDetailedData({ isLoading: false })
    }
  }, [selectedItems, allItems, config.ndexBaseUrl, token])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="h-full border border-border bg-card flex rounded-md shrink-0 relative"
      style={{ width }}
    >
      {/* Resize Handle */}
      {onMouseDownResize && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-accent/50 transition-colors flex items-center justify-center group ${isDragging ? 'bg-accent' : ''}`}
          onMouseDown={onMouseDownResize}
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Panel Content */}
      <div className="flex flex-col flex-1 ml-1">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h3 className="font-medium text-foreground">Details</h3>
        <button
          className="p-1 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
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
            <div className="w-28 h-36 bg-blue-50 dark:bg-blue-950/20 rounded-lg relative transform rotate-6 absolute -right-10 top-6 z-10"></div>
            <div className="w-24 h-32 bg-red-50 dark:bg-red-950/20 rounded-lg relative transform -rotate-12 absolute -right-2 top-14 z-0"></div>
            <div className="w-32 h-40 bg-blue-100 dark:bg-blue-900/30 rounded-lg relative z-20 flex flex-col p-3">
              <div className="w-full h-2 bg-blue-300 dark:bg-blue-600 rounded mb-2"></div>
              <div className="w-3/4 h-2 bg-blue-300 dark:bg-blue-600 rounded mb-2"></div>
              <div className="w-full h-2 bg-blue-300 dark:bg-blue-600 rounded mb-2"></div>
              <div className="w-2/3 h-2 bg-blue-300 dark:bg-blue-600 rounded"></div>
            </div>
            {/* Magnifying glass */}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-yellow-400 dark:bg-yellow-500 rounded-full z-30 flex items-center justify-center">
              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full">
                <div className="w-full h-full relative">
                  <div className="absolute left-3 top-3 w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="absolute left-5 top-5 w-7 h-2 bg-blue-600 transform rotate-45"></div>
                </div>
              </div>
            </div>
            {/* Green dot */}
            <div className="w-8 h-8 bg-green-500 rounded-full absolute -top-4 -left-4 z-30"></div>
          </div>
          <p className="text-foreground font-medium">
            Select an item to see the details
          </p>
        </div>
      )}

      {/* Show item details when one item is selected */}
      {selectedItems.length === 1 && (
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Header with small icon and name */}
          <div className="flex items-center gap-3 mb-6">
            {getItemIcon(
              allItems.find((item) => item.uuid === selectedItems[0])?.type || 'file',
              'medium'
            )}
            <div>
              <h4 className="text-lg font-medium text-foreground">
                {allItems.find((item) => item.uuid === selectedItems[0])?.name || 'Untitled'}
              </h4>
            </div>
          </div>

          {/* Loading state */}
          {detailedData.isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading details...</span>
            </div>
          )}

          {/* Error state */}
          {detailedData.error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                Failed to load details: {detailedData.error}
              </p>
            </div>
          )}

          {/* Detailed content */}
          {!detailedData.isLoading && !detailedData.error && (
            <div className="space-y-4">
              <div>
                <h5 className="text-base font-medium text-muted-foreground mb-3">
                  Details
                </h5>
                <div className="text-sm space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UUID</span>
                    <span className="text-xs font-mono truncate max-w-[150px] text-foreground">
                      {selectedItems[0]}
                    </span>
                  </div>

                  {/* Network Details */}
                  {detailedData.network && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nodes</span>
                        <span className="text-foreground">{detailedData.network.nodeCount?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Edges</span>
                        <span className="text-foreground">{detailedData.network.edgeCount?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Visibility</span>
                        <span className="text-foreground capitalize">{detailedData.network.visibility || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner</span>
                        <span className="text-foreground">{detailedData.network.owner || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="text-foreground">{detailedData.network.version || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">
                          {detailedData.network.creationTime ? formatDate(new Date(detailedData.network.creationTime)) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modified</span>
                        <span className="text-foreground">
                          {detailedData.network.modificationTime ? formatDate(new Date(detailedData.network.modificationTime)) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Has Layout</span>
                        <span className="text-foreground">{detailedData.network.hasLayout ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Certified</span>
                        <span className="text-foreground">{detailedData.network.isCertified ? 'Yes' : 'No'}</span>
                      </div>
                      
                      {detailedData.network.description && (
                        <>
                          <div className="pt-2 border-t border-border">
                            <h5 className="text-base font-medium text-muted-foreground mb-2">
                              Description
                            </h5>
                            <div 
                              className="text-sm text-foreground leading-relaxed break-words"
                              dangerouslySetInnerHTML={{ __html: detailedData.network.description }}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Folder Details */}
                  {detailedData.folder && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parent</span>
                        <span className="text-foreground">{detailedData.folder.parent || 'Home'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modified</span>
                        <span className="text-foreground">
                          {detailedData.folder.modificationTime ? formatDate(detailedData.folder.modificationTime) : 'N/A'}
                        </span>
                      </div>
                      {detailedData.folder.attributes?.updatedBy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated By</span>
                          <span className="text-foreground">{detailedData.folder.attributes.updatedBy}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Shortcut Details */}
                  {detailedData.shortcut && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target</span>
                        <span className="text-xs font-mono truncate max-w-[150px] text-foreground">
                          {detailedData.shortcut.target}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parent</span>
                        <span className="text-foreground">{detailedData.shortcut.parent || 'Home'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modified</span>
                        <span className="text-foreground">
                          {detailedData.shortcut.modificationTime ? formatDate(detailedData.shortcut.modificationTime) : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show multiple items selection UI */}
      {selectedItems.length > 1 && (
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-lg font-medium mb-4 text-foreground">
            {selectedItems.length} items selected
          </p>
          <ul className="space-y-2 text-sm max-h-[400px] overflow-y-auto">
            {selectedItems.map((uuid) => {
              const item = allItems.find((item) => item.uuid === uuid)
              return (
                <li key={uuid} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                  {getItemIcon(item?.type || 'file')}
                  <div className="flex-1 min-w-0">
                    <span className="block truncate text-foreground font-medium">{item?.name || 'Untitled'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{item?.type?.toLowerCase() || 'Unknown'}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}