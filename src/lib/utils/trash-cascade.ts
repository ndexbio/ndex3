import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Minimal structural view of the NDEx client used by the trash cascade.
 * Declared here (rather than importing the concrete client type) so tests can
 * supply a fake without standing up the whole client.
 */
export interface TrashCapableClient {
  files: {
    getFolderList: (
      folderId: string,
      accessKey?: string,
      format?: string,
    ) => Promise<unknown>
    deleteFolder: (folderId: string) => Promise<unknown>
    deleteShortcut: (shortcutId: string) => Promise<unknown>
  }
  networks: {
    deleteNetwork: (networkId: string) => Promise<unknown>
  }
}

/**
 * Safety stop for the recursive walk. Real folder trees are shallow; this only
 * exists so a malformed listing (one that contains its own parent) can't spin
 * forever issuing requests.
 */
export const MAX_FOLDER_DEPTH = 50

/**
 * Moves a single file to the trash.
 *
 * Folders are the interesting case: the NDEx v3 API rejects `DELETE
 * files/folders/{id}` when the folder still has contents, so the folder is
 * emptied depth-first — its children first, then the folder itself. Deletions
 * are sequential because that ordering is exactly what the server requires; a
 * parent cannot go before its children.
 *
 * Deleting a network or shortcut here is a *soft* delete: the server moves it
 * to the trash, where it stays until the retention window expires.
 *
 * Throws if any step fails, leaving the rest of the subtree in place — callers
 * that batch several items should catch per item so one failure doesn't hide
 * the others' outcomes.
 */
export const moveFileToTrash = async (
  client: TrashCapableClient,
  item: Pick<FileItemBase, 'uuid' | 'type'>,
  depth = 0,
): Promise<void> => {
  if (item.type === NDExFileType.FOLDER) {
    if (depth >= MAX_FOLDER_DEPTH) {
      throw new Error(
        `Folder nesting exceeds ${MAX_FOLDER_DEPTH} levels; aborting to avoid a runaway delete`,
      )
    }

    const children = ((await client.files.getFolderList(
      item.uuid,
      undefined,
      'compact',
    )) ?? []) as FileItemBase[]

    for (const child of children) {
      await moveFileToTrash(client, child, depth + 1)
    }

    await client.files.deleteFolder(item.uuid)
    return
  }

  if (item.type === NDExFileType.SHORTCUT) {
    await client.files.deleteShortcut(item.uuid)
    return
  }

  await client.networks.deleteNetwork(item.uuid)
}
