import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import { TrashCapableClient, moveFileToTrash } from './trash-cascade'

const item = (uuid: string, type: NDExFileType): FileItemBase =>
  ({ uuid, name: uuid, type, modificationTime: 0, attributes: {} }) as FileItemBase

/**
 * Fake client that records every call in order, so tests can assert the
 * ordering the server requires (contents before their folder) rather than
 * merely that some calls happened.
 */
const makeClient = (tree: Record<string, FileItemBase[]> = {}) => {
  const calls: string[] = []

  const client: TrashCapableClient = {
    files: {
      getFolderList: jest.fn(async (folderId: string) => {
        calls.push(`list:${folderId}`)
        return tree[folderId] ?? []
      }),
      deleteFolder: jest.fn(async (folderId: string) => {
        calls.push(`deleteFolder:${folderId}`)
      }),
      deleteShortcut: jest.fn(async (shortcutId: string) => {
        calls.push(`deleteShortcut:${shortcutId}`)
      }),
    },
    networks: {
      deleteNetwork: jest.fn(async (networkId: string) => {
        calls.push(`deleteNetwork:${networkId}`)
      }),
    },
  }

  return { client, calls }
}

describe('moveFileToTrash', () => {
  it('deletes a network directly, without touching folder endpoints', async () => {
    const { client, calls } = makeClient()

    await moveFileToTrash(client, item('n-1', NDExFileType.NETWORK))

    expect(calls).toEqual(['deleteNetwork:n-1'])
    expect(client.files.deleteFolder).not.toHaveBeenCalled()
  })

  it('deletes a shortcut via the shortcut endpoint', async () => {
    const { client, calls } = makeClient()

    await moveFileToTrash(client, item('s-1', NDExFileType.SHORTCUT))

    expect(calls).toEqual(['deleteShortcut:s-1'])
  })

  it('empties a folder before deleting it (the GI-46 failure)', async () => {
    const { client, calls } = makeClient({
      F: [item('n-1', NDExFileType.NETWORK), item('s-1', NDExFileType.SHORTCUT)],
    })

    await moveFileToTrash(client, item('F', NDExFileType.FOLDER))

    expect(calls).toEqual([
      'list:F',
      'deleteNetwork:n-1',
      'deleteShortcut:s-1',
      'deleteFolder:F',
    ])
  })

  it('recurses into sub-folders, deleting the deepest contents first', async () => {
    const { client, calls } = makeClient({
      F: [item('sub', NDExFileType.FOLDER), item('n-1', NDExFileType.NETWORK)],
      sub: [item('n-2', NDExFileType.NETWORK)],
    })

    await moveFileToTrash(client, item('F', NDExFileType.FOLDER))

    expect(calls).toEqual([
      'list:F',
      'list:sub',
      'deleteNetwork:n-2',
      'deleteFolder:sub',
      'deleteNetwork:n-1',
      'deleteFolder:F',
    ])
    // The parent must never be deleted before its child.
    expect(calls.indexOf('deleteFolder:sub')).toBeLessThan(
      calls.indexOf('deleteFolder:F'),
    )
  })

  it('deletes an empty folder with no child calls', async () => {
    const { client, calls } = makeClient({ F: [] })

    await moveFileToTrash(client, item('F', NDExFileType.FOLDER))

    expect(calls).toEqual(['list:F', 'deleteFolder:F'])
  })

  it('leaves the folder in place when a child cannot be trashed', async () => {
    const { client } = makeClient({
      F: [item('n-1', NDExFileType.NETWORK)],
    })
    ;(client.networks.deleteNetwork as jest.Mock).mockRejectedValue(
      new Error('permission denied'),
    )

    await expect(
      moveFileToTrash(client, item('F', NDExFileType.FOLDER)),
    ).rejects.toThrow('permission denied')

    // Deleting the folder anyway would have failed server-side and hidden the
    // real cause, so it must not be attempted.
    expect(client.files.deleteFolder).not.toHaveBeenCalled()
  })

  it('aborts a runaway walk when a folder appears inside itself', async () => {
    const { client } = makeClient({
      F: [item('F', NDExFileType.FOLDER)],
    })

    await expect(
      moveFileToTrash(client, item('F', NDExFileType.FOLDER)),
    ).rejects.toThrow(/exceeds 50 levels/)
  })

  it('tolerates a folder listing that returns nothing at all', async () => {
    const { client, calls } = makeClient()
    // Replaces the recording implementation, so only deleteFolder is logged.
    ;(client.files.getFolderList as jest.Mock).mockResolvedValue(
      undefined as unknown as FileItemBase[],
    )

    await moveFileToTrash(client, item('F', NDExFileType.FOLDER))

    expect(client.files.getFolderList).toHaveBeenCalledWith(
      'F',
      undefined,
      'compact',
    )
    expect(calls).toEqual(['deleteFolder:F'])
  })
})
