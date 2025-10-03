import { useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { useFolder } from '@/hooks/use-folder'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { useShortcut } from '@/hooks/use-shortcut'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

export interface MoveOperationResult {
  success: boolean
  movedCount: number
  failedCount: number
  errors: string[]
}

export interface UseFileMoveOperationReturn {
  moveFiles: (itemIds: string[], targetFolderId: string | null) => Promise<MoveOperationResult>
  isMoving: boolean
  error: Error | null
}

/**
 * Hook that provides file move operations
 * Handles moving folders, networks, and shortcuts
 * Used by both drag-and-drop and Move Dialog
 *
 * @param currentFolderId - The current folder ID (source folder)
 * @param displayItems - Array of items available to move
 * @param onSuccess - Optional callback on successful move
 * @param onError - Optional callback on error
 * @returns Object with moveFiles function, isMoving state, and error
 */
export const useFileMoveOperation = (
  currentFolderId: string | null,
  displayItems: FileItemBase[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
): UseFileMoveOperationReturn => {
  // State
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // API hooks
  const { updateFolder } = useFolder()
  const { moveNetworks } = useNetworkOperation()
  const { updateShortcut } = useShortcut()

  // Config and auth for fetching shortcut details
  const config = useConfig()
  const { token } = useAuth()

  /**
   * Move files to a target folder
   * @param itemIds - Array of item UUIDs to move
   * @param targetFolderId - Target folder UUID (null for home folder)
   * @returns Result object with success status and counts
   */
  const moveFiles = async (
    itemIds: string[],
    targetFolderId: string | null
  ): Promise<MoveOperationResult> => {
    // Validation
    if (targetFolderId === currentFolderId) {
      const err = new Error('Cannot move to same folder')
      setError(err)
      if (onError) onError(err)
      throw err
    }

    if (targetFolderId && itemIds.includes(targetFolderId)) {
      const err = new Error('Cannot move folder into itself')
      setError(err)
      if (onError) onError(err)
      throw err
    }

    // TODO: Add circular reference check (folder into descendant)
    // This would require traversing the folder tree

    setIsMoving(true)
    setError(null)

    const result: MoveOperationResult = {
      success: true,
      movedCount: 0,
      failedCount: 0,
      errors: []
    }

    try {
      const itemsToMove = displayItems.filter(item => itemIds.includes(item.uuid))
      console.log('[Move Operation] Items to move:', itemsToMove)
      console.log('[Move Operation] Target folder ID:', targetFolderId)
      const networksToMove: string[] = []

      // Move each item by type
      for (const item of itemsToMove) {
        try {
          if (item.type === NDExFileType.FOLDER) {
            // Move folder by updating its parent
            await updateFolder(item.uuid, {
              name: item.name,
              description: (item as any).description || '',
              parent: targetFolderId || undefined
            })
            result.movedCount++
          } else if (item.type === NDExFileType.NETWORK) {
            // Collect networks to move in batch
            networksToMove.push(item.uuid)
          } else if (item.type === NDExFileType.SHORTCUT) {
            // Fetch the shortcut details first to get target and targetType
            const ndexClient = getNdexClient(config.ndexBaseUrl, token)
            const shortcutData = await ndexClient.files.getShortcut(item.uuid)

            // Move shortcut by updating its parent
            await updateShortcut(item.uuid, {
              name: item.name,
              target: shortcutData.target,
              targetType: shortcutData.targetType,
              parent: targetFolderId || undefined
            })
            result.movedCount++
          }
        } catch (err: any) {
          result.failedCount++
          result.errors.push(`Failed to move ${item.name}: ${err.message}`)
          console.error(`Error moving item ${item.name}:`, err)
        }
      }

      // Move networks in batch
      if (networksToMove.length > 0) {
        try {
          await moveNetworks(networksToMove, targetFolderId)
          result.movedCount += networksToMove.length
        } catch (err: any) {
          result.failedCount += networksToMove.length
          result.errors.push(`Failed to move networks: ${err.message}`)
          console.error('Error moving networks:', err)
        }
      }

      result.success = result.failedCount === 0

      // Call success callback if all moves succeeded
      if (result.success && onSuccess) {
        onSuccess()
      }

      return result

    } catch (err: any) {
      setError(err)
      if (onError) {
        onError(err)
      }
      throw err
    } finally {
      setIsMoving(false)
    }
  }

  return {
    moveFiles,
    isMoving,
    error
  }
}
