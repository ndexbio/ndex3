import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useNetworkOperation } from './use-network-operation'

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

const NETWORK_ID = 'network-1'
const PARENT_ID = 'folder-1'

// Fresh SWR cache per test so a cached network summary can't answer the next
// test's lookups.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

let updateNetworkReference: jest.Mock
let cancelNetworkDOI: jest.Mock
let getNetworkSummary: jest.Mock

const setup = (opts: { isAuthenticated?: boolean } = {}) => {
  const { isAuthenticated = true } = opts

  updateNetworkReference = jest.fn(async () => undefined)
  cancelNetworkDOI = jest.fn(async () => undefined)
  getNetworkSummary = jest.fn(async () => ({
    externalId: NETWORK_ID,
    name: 'My Network',
    parentDirUUID: PARENT_ID,
    edgeCount: 1,
    nodeCount: 1,
    properties: [],
  }))

  mockUseAuth.mockReturnValue({ token: 'tok', isAuthenticated })
  mockGetNdexClient.mockReturnValue({
    networks: {
      updateNetworkReference,
      cancelNetworkDOI,
      v2: { getNetworkSummary },
    },
  })

  return renderHook(() => useNetworkOperation(NETWORK_ID), { wrapper })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useNetworkOperation.updateNetworkReference', () => {
  it('sends the reference to the client for the given network', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.updateNetworkReference(NETWORK_ID, '<p>Pratt D, et al.</p>')
    })

    expect(updateNetworkReference).toHaveBeenCalledWith(
      NETWORK_ID,
      '<p>Pratt D, et al.</p>',
    )
  })

  // The server certifies the network on success — visibility, certification and
  // the iscomplete flag all change — so the cached summary must be refetched
  // rather than left showing the pre-certified state.
  it('refetches the network after certifying it', async () => {
    const { result } = setup()

    await waitFor(() => expect(getNetworkSummary).toHaveBeenCalledTimes(1))

    await act(async () => {
      await result.current.updateNetworkReference(NETWORK_ID, '<p>A reference</p>')
    })

    await waitFor(() => expect(getNetworkSummary).toHaveBeenCalledTimes(2))
  })

  it('refuses without authentication and never reaches the server', async () => {
    const { result } = setup({ isAuthenticated: false })

    await expect(
      result.current.updateNetworkReference(NETWORK_ID, '<p>A reference</p>'),
    ).rejects.toThrow('Authentication required')

    expect(updateNetworkReference).not.toHaveBeenCalled()
  })

  it('propagates a server rejection to the caller', async () => {
    const { result } = setup()
    const forbidden = new Error(
      'This network has already been certified, updating reference is not allowed.',
    )
    updateNetworkReference.mockRejectedValueOnce(forbidden)

    await expect(
      result.current.updateNetworkReference(NETWORK_ID, '<p>A reference</p>'),
    ).rejects.toBe(forbidden)
  })
})

describe('useNetworkOperation.cancelNetworkDOI', () => {
  it('clears the failed request for the given network', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.cancelNetworkDOI(NETWORK_ID)
    })

    expect(cancelNetworkDOI).toHaveBeenCalledWith(NETWORK_ID)
  })

  // Cancelling releases the read-only flag, so the cached row is stale.
  it('refetches the network afterwards', async () => {
    const { result } = setup()
    await waitFor(() => expect(getNetworkSummary).toHaveBeenCalledTimes(1))

    await act(async () => {
      await result.current.cancelNetworkDOI(NETWORK_ID)
    })

    await waitFor(() => expect(getNetworkSummary).toHaveBeenCalledTimes(2))
  })

  it('refuses without authentication and never reaches the server', async () => {
    const { result } = setup({ isAuthenticated: false })

    await expect(result.current.cancelNetworkDOI(NETWORK_ID)).rejects.toThrow(
      'Authentication required',
    )
    expect(cancelNetworkDOI).not.toHaveBeenCalled()
  })

  // The server refuses anything not stuck at "Pending" — a minted DOI is permanent.
  it('propagates a server rejection to the caller', async () => {
    const { result } = setup()
    const forbidden = new Error('Only pending DOI request can be cancelled.')
    cancelNetworkDOI.mockRejectedValueOnce(forbidden)

    await expect(result.current.cancelNetworkDOI(NETWORK_ID)).rejects.toBe(forbidden)
  })
})
