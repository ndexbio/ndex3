import { NDExFileType } from '@js4cytoscape/ndex-client'
import { mapFileListItemToFileItemBase } from './use-file-search'
import { isPreCertified, isDOIAssigned } from '@/lib/utils/network-status'

// The hook module pulls in the auth/config contexts (and keycloak-js, which is
// ESM). The mapper under test is pure, so stub them out.
jest.mock('@/lib/contexts/KeycloakContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/lib/contexts/ConfigContext', () => ({ useConfig: jest.fn() }))

/**
 * The search mapper used to read `item.DOI`, a field the server never returns —
 * so every search result silently lost its DOI state. These pin the shape the
 * server actually sends, verified against /v3/search/files on dev1.
 */

const listItem = (extra: Record<string, unknown> = {}) =>
  ({
    uuid: 'net-1',
    name: 'pmc7707112_network',
    type: NDExFileType.NETWORK,
    modificationTime: 1736548215773,
    attributes: { description: '<p>my test doi</p>' },
    ...extra,
  }) as any

describe('mapFileListItemToFileItemBase — DOI state', () => {
  it('keeps a top-level lowercase doi', () => {
    const mapped = mapFileListItemToFileItemBase(listItem({ doi: '10.18119/N98W3C' }))

    expect(mapped.doi).toBe('10.18119/N98W3C')
    expect(isDOIAssigned(mapped)).toBe(true)
  })

  it('takes a top-level isCertified when the server sends one', () => {
    const mapped = mapFileListItemToFileItemBase(
      listItem({ doi: '10.18119/N98W3C', isCertified: true }),
    )

    expect(mapped.isCertified).toBe(true)
    expect(isPreCertified(mapped)).toBe(false)
  })

  // Search results on older servers carry it under attributes instead.
  it('falls back to attributes.isCertified', () => {
    const mapped = mapFileListItemToFileItemBase(
      listItem({
        doi: '10.18119/N98W3C',
        attributes: { description: 'x', isCertified: false },
      }),
    )

    expect(mapped.isCertified).toBe(false)
    // A minted DOI on an uncertified network is exactly the pre-certified case.
    expect(isPreCertified(mapped)).toBe(true)
  })

  it('prefers the top-level field over the attributes copy', () => {
    const mapped = mapFileListItemToFileItemBase(
      listItem({ doi: 'pending', isCertified: true, attributes: { isCertified: false } }),
    )

    expect(mapped.isCertified).toBe(true)
  })

  it('leaves DOI state undefined for a network that never requested one', () => {
    const mapped = mapFileListItemToFileItemBase(listItem())

    expect(mapped.doi).toBeUndefined()
    expect(isPreCertified(mapped)).toBe(false)
    expect(isDOIAssigned(mapped)).toBe(false)
  })
})
