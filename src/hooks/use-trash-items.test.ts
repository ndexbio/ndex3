import { renderHook } from '@testing-library/react'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useTrashItems } from './use-trash-items'

jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: () => ({ ndexBaseUrl: 'test.ndexbio.org' }),
}))
jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: jest.fn(),
}))
jest.mock('@/lib/api/ndex-client-manager', () => ({
  getNdexClient: jest.fn(),
}))
jest.mock('swr', () => ({ mutate: jest.fn(async () => undefined) }))

const mockUseAuth = useAuth as jest.Mock
const mockGetNdexClient = getNdexClient as jest.Mock

const item = (uuid: string, name: string, type: NDExFileType): FileItemBase =>
  ({ uuid, name, type, modificationTime: 0, attributes: {} }) as FileItemBase

const NET_A = item('n-a', 'Network A', NDExFileType.NETWORK)
const NET_B = item('n-b', 'Network B', NDExFileType.NETWORK)
const FOLDER = item('f-1', 'My Folder', NDExFileType.FOLDER)

describe('useTrashItems.moveItemsToTrash', () => {
  let deleteNetwork: jest.Mock
  let deleteFolder: jest.Mock
  let getFolderList: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    deleteNetwork = jest.fn(async () => undefined)
    deleteFolder = jest.fn(async () => undefined)
    getFolderList = jest.fn(async () => [])

    mockUseAuth.mockReturnValue({ token: 'tok', isAuthenticated: true })
    mockGetNdexClient.mockReturnValue({
      files: { getFolderList, deleteFolder, deleteShortcut: jest.fn() },
      networks: { deleteNetwork },
    })
  })

  const moveItemsToTrash = () =>
    renderHook(() => useTrashItems()).result.current.moveItemsToTrash

  it('reports every item as trashed when all succeed', async () => {
    const result = await moveItemsToTrash()([NET_A, NET_B])

    expect(result.trashed.map((i) => i.uuid)).toEqual(['n-a', 'n-b'])
    expect(result.failed).toEqual([])
  })

  it('keeps going after a failure and trashes the remaining items', async () => {
    deleteNetwork.mockImplementation(async (id: string) => {
      if (id === 'n-a') throw new Error('permission denied')
    })

    const result = await moveItemsToTrash()([NET_A, NET_B])

    // The whole point: one bad item must not abort the rest of the batch.
    expect(result.trashed.map((i) => i.uuid)).toEqual(['n-b'])
    expect(deleteNetwork).toHaveBeenCalledTimes(2)
  })

  it('names the items that failed so the caller can report them', async () => {
    deleteNetwork.mockRejectedValue(new Error('permission denied'))

    const result = await moveItemsToTrash()([NET_A, NET_B])

    expect(result.trashed).toEqual([])
    expect(result.failed.map((f) => f.name)).toEqual(['Network A', 'Network B'])
    expect((result.failed[0].error as Error).message).toBe('permission denied')
  })

  it('attributes a folder failure to the folder, not to its contents', async () => {
    getFolderList.mockResolvedValue([NET_A])
    deleteNetwork.mockRejectedValue(new Error('nope'))

    const result = await moveItemsToTrash()([FOLDER])

    expect(result.failed.map((f) => f.uuid)).toEqual(['f-1'])
    // The cascade stopped before the folder delete, which would 400 anyway.
    expect(deleteFolder).not.toHaveBeenCalled()
  })

  it('refuses to delete anything when the user is not signed in', async () => {
    mockUseAuth.mockReturnValue({ token: '', isAuthenticated: false })

    const result = await moveItemsToTrash()([NET_A])

    expect(deleteNetwork).not.toHaveBeenCalled()
    expect(mockGetNdexClient).not.toHaveBeenCalled()
    expect(result.trashed).toEqual([])
    expect(result.failed.map((f) => f.uuid)).toEqual(['n-a'])
  })

  it('does nothing and reports nothing for an empty batch', async () => {
    const result = await moveItemsToTrash()([])

    expect(result).toEqual({ trashed: [], failed: [] })
    expect(deleteNetwork).not.toHaveBeenCalled()
  })
})
