import { act, renderHook } from '@testing-library/react'
import { useCyNDEx, __resetCyStatusForTests } from '@/hooks/use-cyndex'

/**
 * Tests for the Cytoscape Desktop availability polling in useCyNDEx.
 *
 * The hook keeps a MODULE-LEVEL singleton poller (shared interval + listener set
 * + cached availability). We do NOT reset modules between tests — that would load
 * a second React instance and break renderHook. Testing Library auto-unmounts
 * after each test, which empties the listener set and (via the hook's
 * unsubscribe) stops the poller and resets the checking flag.
 *
 * IMPORTANT: we use fake timers AND avoid `waitFor`. RTL's `waitFor` polls using
 * real timers internally, so with `jest.useFakeTimers()` installed it can never
 * re-check and just spins to timeout. Instead we deterministically flush the
 * probe's promise chain with `jest.advanceTimersByTimeAsync(...)` inside act(),
 * then assert synchronously.
 */

const mockGetCyNDExStatus = jest.fn()
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

jest.mock('@/lib/api/ndex-client-manager', () => ({
  __esModule: true,
  getNdexClient: jest.fn(),
}))

// Advance fake time by `ms` while draining the microtasks the probe schedules
// (its then/finally). Wrapped in act() so React state updates are applied.
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}

describe('useCyNDEx — Cytoscape Desktop availability', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    __resetCyStatusForTests()
    mockGetCyNDExStatus.mockReset()
    mockAddToast.mockReset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('starts in a "checking" state before the first probe resolves', () => {
    // Never resolves, so the first probe stays pending and we stay "checking".
    mockGetCyNDExStatus.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCyNDEx())

    expect(result.current.isCheckingCytoscape).toBe(true)
    expect(result.current.isCytoscapeAvailable).toBe(false)
  })

  it('marks Cytoscape available when the status probe resolves', async () => {
    mockGetCyNDExStatus.mockResolvedValue({ status: 'ok' })

    const { result } = renderHook(() => useCyNDEx())

    // Flush the immediate probe (fired from the subscribe effect).
    await advance(0)

    expect(result.current.isCheckingCytoscape).toBe(false)
    expect(result.current.isCytoscapeAvailable).toBe(true)
  })

  it('marks Cytoscape unavailable when the status probe rejects', async () => {
    mockGetCyNDExStatus.mockRejectedValue(new Error('connection refused'))

    const { result } = renderHook(() => useCyNDEx())

    await advance(0)

    expect(result.current.isCheckingCytoscape).toBe(false)
    expect(result.current.isCytoscapeAvailable).toBe(false)
  })

  it('flips from unavailable to available on a later poll', async () => {
    mockGetCyNDExStatus
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ status: 'ok' })

    const { result } = renderHook(() => useCyNDEx())

    // First (immediate) probe fails.
    await advance(0)
    expect(result.current.isCytoscapeAvailable).toBe(false)

    // Next interval tick succeeds.
    await advance(4000)
    expect(result.current.isCytoscapeAvailable).toBe(true)
  })

  it('shares one poller across multiple hook instances (single interval)', async () => {
    mockGetCyNDExStatus.mockResolvedValue({ status: 'ok' })

    const a = renderHook(() => useCyNDEx())
    const b = renderHook(() => useCyNDEx())

    await advance(0)

    expect(a.result.current.isCytoscapeAvailable).toBe(true)
    expect(b.result.current.isCytoscapeAvailable).toBe(true)

    // First subscriber fires one immediate probe; the second reuses the shared
    // poller rather than starting its own.
    expect(mockGetCyNDExStatus).toHaveBeenCalledTimes(1)
  })
})
