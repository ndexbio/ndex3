import { NDExFileType } from '@js4cytoscape/ndex-client'
import {
  resolveNetworkTarget,
  targetsNetwork,
  targetsFolder,
} from './shortcut-resolver'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

jest.mock('@/lib/api/ndex-client-manager', () => ({
  getNdexClient: jest.fn(),
}))

const mockGetNdexClient = getNdexClient as jest.Mock

const OPTIONS = { ndexBaseUrl: 'test.ndexbio.org', token: 'tok' }

describe('targetsNetwork / targetsFolder', () => {
  it('network rows target a network', () => {
    expect(targetsNetwork({ type: NDExFileType.NETWORK })).toBe(true)
    expect(targetsFolder({ type: NDExFileType.NETWORK })).toBe(false)
  })

  it('folder rows target a folder', () => {
    expect(targetsFolder({ type: NDExFileType.FOLDER })).toBe(true)
    expect(targetsNetwork({ type: NDExFileType.FOLDER })).toBe(false)
  })

  it('shortcut-to-network targets a network', () => {
    const item = {
      type: NDExFileType.SHORTCUT,
      attributes: { target: 'n-1', target_type: NDExFileType.NETWORK },
    }
    expect(targetsNetwork(item)).toBe(true)
    expect(targetsFolder(item)).toBe(false)
  })

  it('shortcut-to-folder targets a folder — never gets network actions', () => {
    const item = {
      type: NDExFileType.SHORTCUT,
      attributes: { target: 'f-1', target_type: NDExFileType.FOLDER },
    }
    expect(targetsFolder(item)).toBe(true)
    expect(targetsNetwork(item)).toBe(false)
  })

  it('shortcut with no target_type is assumed to target a network', () => {
    const item = { type: NDExFileType.SHORTCUT, attributes: { target: 'n-1' } }
    expect(targetsNetwork(item)).toBe(true)
  })

  it('null/undefined items target nothing', () => {
    expect(targetsNetwork(null)).toBe(false)
    expect(targetsFolder(undefined)).toBe(false)
  })
})

describe('resolveNetworkTarget', () => {
  beforeEach(() => {
    mockGetNdexClient.mockReset()
  })

  it('returns a genuine network unchanged', async () => {
    const result = await resolveNetworkTarget(
      'n-1',
      NDExFileType.NETWORK,
      {},
      OPTIONS,
    )
    expect(result).toEqual({ networkId: 'n-1', accessKey: undefined })
  })

  it('returns the page access key for a genuine network', async () => {
    const result = await resolveNetworkTarget(
      'n-1',
      NDExFileType.NETWORK,
      {},
      { ...OPTIONS, accessKey: 'page-key' },
    )
    expect(result).toEqual({ networkId: 'n-1', accessKey: 'page-key' })
  })

  it('resolves a single-level network shortcut to the TARGET uuid', async () => {
    const result = await resolveNetworkTarget(
      'sc-1',
      NDExFileType.SHORTCUT,
      { target: 'n-1', target_type: NDExFileType.NETWORK, target_status: 'ACTIVE' },
      OPTIONS,
    )
    expect(result.networkId).toBe('n-1')
  })

  it('treats an item typed NETWORK but carrying a target as a shortcut', async () => {
    const result = await resolveNetworkTarget(
      'sc-1',
      NDExFileType.NETWORK,
      { target: 'n-1' },
      OPTIONS,
    )
    expect(result.networkId).toBe('n-1')
  })

  it('follows a shortcut chain through getShortcut to the final network', async () => {
    const getShortcut = jest.fn().mockResolvedValue({
      target: 'n-9',
      targetType: NDExFileType.NETWORK,
      targetStatus: 'ACTIVE',
    })
    mockGetNdexClient.mockReturnValue({ files: { getShortcut } })

    const result = await resolveNetworkTarget(
      'sc-1',
      NDExFileType.SHORTCUT,
      { target: 'sc-2', target_type: NDExFileType.SHORTCUT },
      OPTIONS,
    )
    expect(getShortcut).toHaveBeenCalledWith('sc-2', undefined)
    expect(result.networkId).toBe('n-9')
  })

  it('uses the page access key to resolve an intermediate shortcut', async () => {
    const getShortcut = jest.fn().mockResolvedValue({
      target: 'n-9',
      targetType: NDExFileType.NETWORK,
      targetStatus: 'ACTIVE',
    })
    mockGetNdexClient.mockReturnValue({ files: { getShortcut } })

    const result = await resolveNetworkTarget(
      'sc-1',
      NDExFileType.SHORTCUT,
      { target: 'sc-2', target_type: NDExFileType.SHORTCUT },
      { ...OPTIONS, accessKey: 'page-key' },
    )

    expect(getShortcut).toHaveBeenCalledWith('sc-2', 'page-key')
    expect(result).toEqual({ networkId: 'n-9', accessKey: 'page-key' })
  })

  it('keeps the access key found on the chain', async () => {
    const result = await resolveNetworkTarget(
      'sc-1',
      NDExFileType.SHORTCUT,
      {
        target: 'n-1',
        target_type: NDExFileType.NETWORK,
        accessKey: 'chain-key',
      },
      OPTIONS,
    )
    expect(result.accessKey).toBe('chain-key')
  })

  it('rejects an inactive shortcut', async () => {
    await expect(
      resolveNetworkTarget(
        'sc-1',
        NDExFileType.SHORTCUT,
        { target: 'n-1', target_status: 'DELETED' },
        OPTIONS,
      ),
    ).rejects.toThrow(/no longer valid/i)
  })

  it('rejects a folder target', async () => {
    await expect(
      resolveNetworkTarget(
        'sc-1',
        NDExFileType.SHORTCUT,
        { target: 'f-1', target_type: NDExFileType.FOLDER },
        OPTIONS,
      ),
    ).rejects.toThrow(/only networks/i)
  })

  it('rejects a shortcut with no target', async () => {
    await expect(
      resolveNetworkTarget('sc-1', NDExFileType.SHORTCUT, {}, OPTIONS),
    ).rejects.toThrow(/missing target/i)
  })

  it('bails out of a circular shortcut chain', async () => {
    const getShortcut = jest.fn().mockResolvedValue({
      target: 'sc-loop',
      targetType: NDExFileType.SHORTCUT,
      targetStatus: 'ACTIVE',
    })
    mockGetNdexClient.mockReturnValue({ files: { getShortcut } })

    await expect(
      resolveNetworkTarget(
        'sc-1',
        NDExFileType.SHORTCUT,
        { target: 'sc-loop', target_type: NDExFileType.SHORTCUT },
        OPTIONS,
      ),
    ).rejects.toThrow(/too deep/i)
  })
})
