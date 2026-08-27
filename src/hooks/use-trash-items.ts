import { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { FileItemBase } from '@/types/api/ndex/File'
import { TrashCapableClient, moveFileToTrash } from '@/lib/utils/trash-cascade'

export interface TrashItemFailure {
  uuid: string
  name: string
  error: unknown
}

export interface TrashItemsResult {
  /** Items whose whole subtree reached the trash. */
  trashed: FileItemBase[]
  /** Items that could not be trashed, with the error that stopped them. */
  failed: TrashItemFailure[]
}

/**
 * Hook providing the shared "move to trash" operation used by the account view
 * and by search results, so both get identical cascade and reporting behaviour.
 */
export const useTrashItems = () => {
  const config = useConfig()
  const { token, isAuthenticated } = useAuth()

  /**
   * Moves every given item to the trash, continuing past individual failures.
   *
   * Never rejects: the per-item outcome is returned so callers can report a
   * partial result truthfully instead of claiming success for a batch in which
   * some items were left behind.
   */
  const moveItemsToTrash = async (
    items: FileItemBase[],
  ): Promise<TrashItemsResult> => {
    const result: TrashItemsResult = { trashed: [], failed: [] }

    if (!isAuthenticated) {
      return {
        trashed: [],
        failed: items.map((item) => ({
          uuid: item.uuid,
          name: item.name,
          error: new Error('Authentication required to move items to trash'),
        })),
      }
    }

    const client = getNdexClient(
      config.ndexBaseUrl,
      token,
    ) as unknown as TrashCapableClient

    for (const item of items) {
      try {
        await moveFileToTrash(client, item)
        result.trashed.push(item)
      } catch (error) {
        console.error(`Error moving "${item.name}" to trash:`, error)
        result.failed.push({ uuid: item.uuid, name: item.name, error })
      }
    }

    if (result.trashed.length > 0 || result.failed.length > 0) {
      // The cascade can empty folders anywhere in the tree, and a partial
      // failure leaves a folder in a new, half-emptied state — so drop every
      // folder listing for this user rather than guessing which ones moved.
      await globalMutate(
        (key) =>
          Array.isArray(key) && key[0] === 'folderContents' && key[2] === token,
      )
      await globalMutate(
        (key) => Array.isArray(key) && key[0] === 'trashContents',
      )
    }

    return result
  }

  return { moveItemsToTrash }
}
