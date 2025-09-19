import { useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useToast } from '@/lib/contexts/ToastContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Hook for copying networks and shortcuts with optimistic UI updates
 */
export const useNetworkCopy = () => {
  const [isCopying, setIsCopying] = useState<Record<string, boolean>>({})
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()
  const { addToast } = useToast()

  /**
   * Copy a network or shortcut to the same folder
   * @param fileId The ID of the file to copy
   * @param fileName The name of the file (for user feedback)
   * @param fileType The type of file (NETWORK or SHORTCUT)
   * @param parentFolderId The parent folder ID where the copy will be placed
   * @param accessKey Optional access key for protected files
   * @returns Promise that resolves when operation is complete
   */
  const copyFile = async (
    fileId: string,
    fileName: string,
    fileType: NDExFileType,
    parentFolderId: string | null,
    accessKey?: string
  ): Promise<{ success: boolean; newFileId?: string; error?: Error | unknown }> => {
    if (!isAuthenticated) {
      const error = new Error('Authentication required to copy files')
      addToast({
        description: 'You must be logged in to copy files',
        type: 'error'
      })
      return { success: false, error }
    }

    // Validate file type
    if (fileType !== NDExFileType.NETWORK && fileType !== NDExFileType.SHORTCUT) {
      const error = new Error(`Unsupported file type: ${fileType}`)
      addToast({
        description: 'Only networks and shortcuts can be copied',
        type: 'error'
      })
      return { success: false, error }
    }

    try {
      // Set copying state for this file
      setIsCopying(prev => ({ ...prev, [fileId]: true }))

      const ndexClient = getNdexClient(config.ndexBaseUrl, token)

      // Call the NDEx API to copy the file
      // Set targetId to null for home directory, or the actual folder ID for subfolders
      const result = await ndexClient.files.copyFile({
        fileId,
        targetId: parentFolderId || null,
        type: fileType,
        accessKey
      })

      // Get the detailed summary of the copied file
      const copiedFileSummary = await ndexClient.networks.v2.getNetworkSummary(result.uuid, { accesskey: accessKey })

      // Transform the summary to match the FileItemBase structure used in the table
      const copiedFileItem: FileItemBase = {
        uuid: result.uuid,
        name: copiedFileSummary.name || 'Unnamed copy',
        type: fileType,
        modificationTime: result.modificationTime,
        attributes: {
          edges: copiedFileSummary.edgeCount || 0,
          nodes: copiedFileSummary.nodeCount || 0,
          edgeCount: copiedFileSummary.edgeCount || 0,
          nodeCount: copiedFileSummary.nodeCount || 0,
          visibility: copiedFileSummary.visibility,
          owner: copiedFileSummary.owner || '',
          updatedBy: copiedFileSummary.owner || '',
          // Add other relevant attributes from the summary
          description: copiedFileSummary.description || '',
          version: copiedFileSummary.version || '',
          doi: copiedFileSummary.doi || '',
          organism: copiedFileSummary.organism || '',
          disease: copiedFileSummary.disease || '',
          tissue: copiedFileSummary.tissue || '',
          parent: parentFolderId || ''
        }
      }

      // Optimistically update the folder contents cache, then revalidate for consistency

      // Handle the null vs empty string mismatch: cache uses null for home folder, but copy operation might pass empty string
      const targetFolderId = parentFolderId === '' ? null : parentFolderId

      globalMutate(
        (key) => {
          const isMatch = Array.isArray(key) &&
            key[0] === 'folderContents' &&
            key[1] === targetFolderId &&
            key[2] === token

          return isMatch
        },
        (currentData: { items: FileItemBase[] } | undefined) => {
          if (currentData && Array.isArray(currentData.items)) {
            return {
              ...currentData,
              items: [...currentData.items, copiedFileItem]
            }
          }
          return currentData
        },
        false // Show optimistic update first
      )

      // Then trigger revalidation to ensure consistency with server state
      setTimeout(() => {
        globalMutate(
          (key) => {
            return Array.isArray(key) &&
              key[0] === 'folderContents' &&
              key[1] === targetFolderId &&
              key[2] === token
          },
          undefined, // Let SWR fetch fresh data from server
          true // Revalidate to ensure consistency
        )
      }, 100) // Small delay to let optimistic update render first

      // Show success toast
      addToast({
        description: `Successfully copied "${fileName}"`,
        type: 'success'
      })

      return { success: true, newFileId: result.uuid }

    } catch (error) {
      console.error('Error copying file:', error)

      // Show error toast with specific error message
      let errorMessage = `Failed to copy "${fileName}"`
      if (error instanceof Error) {
        if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage += ': You do not have permission to copy this file'
        } else if (error.message.includes('not found')) {
          errorMessage += ': File not found'
        } else {
          errorMessage += `: ${error.message}`
        }
      }

      addToast({
        description: errorMessage,
        type: 'error'
      })

      return { success: false, error }

    } finally {
      // Clear copying state
      setIsCopying(prev => {
        const newState = { ...prev }
        delete newState[fileId]
        return newState
      })
    }
  }

  /**
   * Copy multiple files
   * @param files Array of files to copy with their metadata
   * @returns Promise that resolves with results for each file
   */
  const copyMultipleFiles = async (
    files: Array<{
      fileId: string
      fileName: string
      fileType: NDExFileType
      parentFolderId: string | null
      accessKey?: string
    }>
  ) => {
    const results = {
      successful: [] as string[],
      failed: [] as { fileId: string; fileName: string; error: Error | unknown }[]
    }

    // Copy files one by one to avoid overwhelming the server
    for (const file of files) {
      const result = await copyFile(
        file.fileId,
        file.fileName,
        file.fileType,
        file.parentFolderId,
        file.accessKey
      )

      if (result.success && result.newFileId) {
        results.successful.push(result.newFileId)
      } else {
        results.failed.push({
          fileId: file.fileId,
          fileName: file.fileName,
          error: result.error
        })
      }
    }

    return results
  }

  return {
    copyFile,
    copyMultipleFiles,
    isCopying
  }
}