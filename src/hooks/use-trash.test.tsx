import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useTrash } from './use-trash'

jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: () => ({ ndexBaseUrl: 'test.ndexbio.org' }),
}))
jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: jest.fn(),
}))
jest.mock('@/lib/api/ndex-client-manager', () => ({
  getNdexClient: jest.fn(),
}))

const mockUseAuth = useAuth as jest.Mock
const mockGetNdexClient = getNdexClient as jest.Mock

// Fresh SWR cache per test — the trash listing is cached under a key shared by
// every test, so a leaked entry would silently answer the next test's lookups.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

const trashed = (
  uuid: string,
  type: NDExFileType,
  extra: Record<string, unknown> = {},
): FileItemBase =>
  ({
    uuid,
    name: uuid,
    type,
    modificationTime: 0,
    attributes: {},
    ...extra,
  }) as FileItemBase

/**
 * Trashing a folder cascades, so its contents arrive in the trash as flat
 * siblings. These cover the expansion that puts the subtree back together.
 */
describe('useTrash.resolveRestoreSelection', () => {
  let getFolder: jest.Mock
  let getNetworkSummary: jest.Mock

  const setup = async (items: FileItemBase[]) => {
    getFolder = jest.fn(async (id: string) => ({ uuid: id, parent: '' }))
    getNetworkSummary = jest.fn(async (id: string) => ({ externalId: id }))

    mockUseAuth.mockReturnValue({ token: 'tok', isAuthenticated: true })
    mockGetNdexClient.mockReturnValue({
      files: {
        getTrash: jest.fn(async () => items),
        getFolder,
        getShortcut: jest.fn(),
      },
      networks: { getNetworkSummary },
    })

    const { result } = renderHook(() => useTrash(), { wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(items.length))
    return result
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('expands a folder to the contents trashed with it', async () => {
    const result = await setup([
      trashed('F', NDExFileType.FOLDER, { parent: '' }),
      trashed('n-1', NDExFileType.NETWORK, { parent: 'F' }),
      trashed('other', NDExFileType.NETWORK, { parent: '' }),
    ])

    const selection = await result.current.resolveRestoreSelection(['F'])

    expect(selection.descendants.map((i) => i.uuid)).toEqual(['n-1'])
    expect(selection.isPartial).toBe(false)
    // Parentage came from the listing, so no per-item lookups were needed.
    expect(getNetworkSummary).not.toHaveBeenCalled()
  })

  it('does not expand — or look anything up — for a plain network', async () => {
    const result = await setup([
      trashed('n-1', NDExFileType.NETWORK, { parent: '' }),
    ])

    const selection = await result.current.resolveRestoreSelection(['n-1'])

    expect(selection.roots.map((i) => i.uuid)).toEqual(['n-1'])
    expect(selection.descendants).toEqual([])
    expect(getFolder).not.toHaveBeenCalled()
    expect(getNetworkSummary).not.toHaveBeenCalled()
  })

  it('falls back to per-item lookups when the listing omits parentage', async () => {
    const result = await setup([
      trashed('F', NDExFileType.FOLDER),
      trashed('n-1', NDExFileType.NETWORK),
    ])
    getNetworkSummary.mockResolvedValue({
      externalId: 'n-1',
      parentDirUUID: 'F',
    })

    const selection = await result.current.resolveRestoreSelection(['F'])

    expect(getNetworkSummary).toHaveBeenCalledWith('n-1')
    expect(selection.descendants.map((i) => i.uuid)).toEqual(['n-1'])
    expect(selection.isPartial).toBe(false)
  })

  it('flags a partial result when a parent lookup fails, without giving up', async () => {
    const result = await setup([
      trashed('F', NDExFileType.FOLDER),
      trashed('n-1', NDExFileType.NETWORK),
      trashed('n-2', NDExFileType.NETWORK),
    ])
    getNetworkSummary.mockImplementation(async (id: string) => {
      if (id === 'n-1') throw new Error('not found')
      return { externalId: id, parentDirUUID: 'F' }
    })

    const selection = await result.current.resolveRestoreSelection(['F'])

    // The readable branch is still restored; the unreadable one is admitted to.
    expect(selection.descendants.map((i) => i.uuid)).toEqual(['n-2'])
    expect(selection.isPartial).toBe(true)
  })
})
