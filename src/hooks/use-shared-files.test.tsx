import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useSharedFiles } from './use-shared-files'
import { isDOIPending, isPreCertified, isDOIAssigned } from '@/lib/utils/network-status'

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

/**
 * The server returns these status fields at the top level of FileItemSummary,
 * and the row components read them there. The mapper used to hand-pick a
 * shorter list, which silently dropped every one of them.
 */
const sharedNetwork = {
  uuid: 'net-1',
  name: 'Shared Network',
  type: NDExFileType.NETWORK,
  modificationTime: 1700000000000,
  owner: 'alice',
  owner_id: 'alice-uuid',
  visibility: 'PRIVATE',
  doi: '10.18119/N9TEST',
  isCertified: false,
  isReadOnly: true,
  isValid: true,
  isShared: true,
  warnings: ['a warning'],
  errorMessage: '',
  attributes: { description: 'x' },
}

const setup = (items: unknown[]) => {
  mockUseAuth.mockReturnValue({ token: 'tok', isAuthenticated: true })
  mockGetNdexClient.mockReturnValue({
    files: { listShares: jest.fn(async () => items) },
  })
  return renderHook(() => useSharedFiles(), { wrapper })
}

beforeEach(() => jest.clearAllMocks())

describe('useSharedFiles — status fields survive the mapping', () => {
  it('carries DOI state through to the item', async () => {
    const { result } = setup([sharedNetwork])

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    const item = result.current.items[0]

    expect(item.doi).toBe('10.18119/N9TEST')
    expect(item.isCertified).toBe(false)
    // ...and therefore reads correctly through the shared predicates.
    expect(isDOIAssigned(item)).toBe(true)
    expect(isPreCertified(item)).toBe(true)
  })

  it('carries a failed mint through', async () => {
    const { result } = setup([{ ...sharedNetwork, doi: 'Pending' }])

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(isDOIPending(result.current.items[0])).toBe(true)
  })

  it.each(['isReadOnly', 'isValid', 'isShared', 'warnings', 'errorMessage'])(
    'carries %s through',
    async (field) => {
      const { result } = setup([sharedNetwork])

      await waitFor(() => expect(result.current.items).toHaveLength(1))
      expect(result.current.items[0]).toHaveProperty(
        field,
        (sharedNetwork as Record<string, unknown>)[field],
      )
    },
  )

  it('still normalises the owner UUID from owner_id', async () => {
    const { result } = setup([sharedNetwork])

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].ownerUUID).toBe('alice-uuid')
  })

  it('still maps shortcut target attributes', async () => {
    const { result } = setup([
      {
        uuid: 'sc-1',
        name: 'A shortcut',
        type: NDExFileType.SHORTCUT,
        modificationTime: 1,
        target: 'net-9',
        targetType: NDExFileType.NETWORK,
        attributes: {},
      },
    ])

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0].attributes).toMatchObject({
      target: 'net-9',
      target_type: NDExFileType.NETWORK,
    })
  })
})
