import { renderHook, act } from '@testing-library/react'
import { useCyNDEx } from '@/hooks/use-cyndex'

/**
 * Tests for the network-shortcut fix in useCyNDEx.openInCytoscape.
 *
 * The bug: a shortcut surfaced from the search results page arrives typed as
 * NETWORK (via the dropdownType fallback), so resolveShortcutChain used to
 * return the shortcut's OWN uuid and Cytoscape tried to load a shortcut id as a
 * network. The fix detects a shortcut from attributes.target regardless of the
 * type label, tolerates missing target_type/target_status, and posts the TARGET
 * network id to Cytoscape.
 *
 * Each test drives openInCytoscape and asserts which id reaches
 * postNDExNetworkToCytoscape. CyNDExService is mocked; getCyNDExStatus resolves
 * so the post step is reached.
 */

const mockGetCyNDExStatus = jest.fn().mockResolvedValue({ status: 'ok' })
const mockPostNetwork = jest.fn().mockResolvedValue(undefined)
const mockSetNDExBaseURL = jest.fn()
const mockSetAuthToken = jest.fn()

jest.mock('@js4cytoscape/ndex-client', () => ({
  __esModule: true,
  CyNDExService: jest.fn().mockImplementation(() => ({
    getCyNDExStatus: mockGetCyNDExStatus,
    postNDExNetworkToCytoscape: mockPostNetwork,
    setNDExBaseURL: mockSetNDExBaseURL,
    setAuthToken: mockSetAuthToken,
  })),
  NDExFileType: {
    NETWORK: 'NETWORK',
    SHORTCUT: 'SHORTCUT',
    FOLDER: 'FOLDER',
  },
}))

jest.mock('@/lib/contexts/ConfigContext', () => ({
  __esModule: true,
  useConfig: () => ({ ndexBaseUrl: 'http://localhost:8080/ndexbio-rest' }),
}))

jest.mock('@/lib/contexts/KeycloakContext', () => ({
  __esModule: true,
  useAuth: () => ({ keycloak: null, isAuthenticated: false, token: undefined }),
}))

const mockAddToast = jest.fn()
jest.mock('@/lib/contexts/ToastContext', () => ({
  __esModule: true,
  useToast: () => ({ addToast: mockAddToast }),
}))

const mockGetShortcut = jest.fn()
jest.mock('@/lib/api/ndex-client-manager', () => ({
  __esModule: true,
  getNdexClient: () => ({
    files: { getShortcut: mockGetShortcut },
  }),
}))

// Pull the enum from the mocked module so string values match the hook.
const { NDExFileType } = jest.requireMock('@js4cytoscape/ndex-client')

const NETWORK_ID = '11111111-1111-1111-1111-111111111111'
const SHORTCUT_ID = '22222222-2222-2222-2222-222222222222'
const TARGET_ID = '33333333-3333-3333-3333-333333333333'
const SECOND_TARGET_ID = '44444444-4444-4444-4444-444444444444'

describe('useCyNDEx.openInCytoscape — network shortcut resolution', () => {
  beforeEach(() => {
    mockGetCyNDExStatus.mockClear().mockResolvedValue({ status: 'ok' })
    mockPostNetwork.mockClear().mockResolvedValue(undefined)
    mockSetNDExBaseURL.mockClear()
    mockSetAuthToken.mockClear()
    mockAddToast.mockClear()
    mockGetShortcut.mockReset()
  })

  it('posts its own uuid for a plain network', async () => {
    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await result.current.openInCytoscape(NETWORK_ID, 'My Network', NDExFileType.NETWORK, {})
    })

    expect(mockPostNetwork).toHaveBeenCalledTimes(1)
    expect(mockPostNetwork).toHaveBeenCalledWith(NETWORK_ID, undefined)
  })

  it('posts the target uuid for a shortcut typed as SHORTCUT', async () => {
    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await result.current.openInCytoscape(SHORTCUT_ID, 'A Shortcut', NDExFileType.SHORTCUT, {
        target: TARGET_ID,
        target_type: NDExFileType.NETWORK,
        target_status: 'ACTIVE',
      })
    })

    expect(mockPostNetwork).toHaveBeenCalledWith(TARGET_ID, undefined)
  })

  it('posts the target uuid for a shortcut MISLABELED as NETWORK (the bug case)', async () => {
    const { result } = renderHook(() => useCyNDEx())

    // dropdownType fallback hands us NETWORK, but attributes.target marks it a shortcut.
    await act(async () => {
      await result.current.openInCytoscape(SHORTCUT_ID, 'Search Shortcut', NDExFileType.NETWORK, {
        target: TARGET_ID,
        target_type: NDExFileType.NETWORK,
        target_status: 'ACTIVE',
      })
    })

    // Must post the TARGET, not the shortcut's own id.
    expect(mockPostNetwork).toHaveBeenCalledWith(TARGET_ID, undefined)
    expect(mockPostNetwork).not.toHaveBeenCalledWith(SHORTCUT_ID, expect.anything())
  })

  it('resolves to the target when target_type is missing (lightweight search item)', async () => {
    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await result.current.openInCytoscape(SHORTCUT_ID, 'Lean Shortcut', NDExFileType.NETWORK, {
        target: TARGET_ID,
        // no target_type, no target_status
      })
    })

    expect(mockPostNetwork).toHaveBeenCalledWith(TARGET_ID, undefined)
  })

  it('passes the access key through when present on the shortcut', async () => {
    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await result.current.openInCytoscape(SHORTCUT_ID, 'Keyed Shortcut', NDExFileType.SHORTCUT, {
        target: TARGET_ID,
        target_type: NDExFileType.NETWORK,
        target_status: 'ACTIVE',
        accessKey: 'abc123',
      })
    })

    expect(mockPostNetwork).toHaveBeenCalledWith(TARGET_ID, 'abc123')
  })

  it('follows a shortcut-to-shortcut chain to the final network', async () => {
    // First shortcut points to a second shortcut; that one points to a network.
    mockGetShortcut.mockResolvedValue({
      uuid: SECOND_TARGET_ID,
      target: SECOND_TARGET_ID,
      targetType: NDExFileType.NETWORK,
      targetStatus: 'ACTIVE',
    })

    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await result.current.openInCytoscape(SHORTCUT_ID, 'Chained', NDExFileType.SHORTCUT, {
        target: TARGET_ID,
        target_type: NDExFileType.SHORTCUT,
        target_status: 'ACTIVE',
      })
    })

    expect(mockGetShortcut).toHaveBeenCalledWith(TARGET_ID)
    expect(mockPostNetwork).toHaveBeenCalledWith(SECOND_TARGET_ID, undefined)
  })

  it('does not post and shows an error toast for an inactive shortcut', async () => {
    const { result } = renderHook(() => useCyNDEx())

    await act(async () => {
      await expect(
        result.current.openInCytoscape(SHORTCUT_ID, 'Dead Shortcut', NDExFileType.SHORTCUT, {
          target: TARGET_ID,
          target_type: NDExFileType.NETWORK,
          target_status: 'DELETED',
        }),
      ).rejects.toThrow(/no longer valid/i)
    })

    expect(mockPostNetwork).not.toHaveBeenCalled()
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    )
  })
})
