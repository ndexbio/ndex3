import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import {
  useFolderContents,
  useFolder,
  folderContentsKey,
  folderKey,
} from './use-folder'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

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

const anonymous = { token: '', isAuthenticated: false, isInitializing: false }
const signedIn = { token: 'tok', isAuthenticated: true, isInitializing: false }
const initializing = { token: '', isAuthenticated: false, isInitializing: true }

// Fresh SWR cache per test so results don't leak between cases
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
)

describe('cache key builders', () => {
  it('folderContentsKey keeps token at index 2 (mutate filters depend on it)', () => {
    expect(folderContentsKey('f-1', 'tok', 'key', false)).toEqual([
      'folderContents',
      'f-1',
      'tok',
      'key',
    ])
  })

  it('keys are null while Keycloak is initializing', () => {
    expect(folderContentsKey('f-1', '', undefined, true)).toBeNull()
    expect(folderKey('f-1', '', undefined, true)).toBeNull()
  })

  it('folderKey is null without a folderId', () => {
    expect(folderKey(null, 'tok', undefined, false)).toBeNull()
  })

  it('keys are built for anonymous viewers (no auth gate)', () => {
    expect(folderContentsKey('f-1', '', undefined, false)).toEqual([
      'folderContents',
      'f-1',
      '',
      null,
    ])
  })
})

describe('useFolderContents', () => {
  let getFolderList: jest.Mock

  beforeEach(() => {
    getFolderList = jest.fn().mockResolvedValue([{ uuid: 'n-1', name: 'net' }])
    mockGetNdexClient.mockReturnValue({ files: { getFolderList } })
  })

  it('fetches for anonymous viewers (the original GI-33 bug)', async () => {
    mockUseAuth.mockReturnValue(anonymous)

    const { result } = renderHook(() => useFolderContents('f-1'), { wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(mockGetNdexClient).toHaveBeenCalledWith('test.ndexbio.org', '')
    expect(getFolderList).toHaveBeenCalledWith('f-1', undefined, 'compact')
  })

  it('passes the access key through to the API', async () => {
    mockUseAuth.mockReturnValue(anonymous)

    const { result } = renderHook(
      () => useFolderContents('f-1', 'secret-key'),
      { wrapper },
    )

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(getFolderList).toHaveBeenCalledWith('f-1', 'secret-key', 'compact')
  })

  it('sends the token for signed-in viewers', async () => {
    mockUseAuth.mockReturnValue(signedIn)

    const { result } = renderHook(() => useFolderContents('f-1'), { wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(mockGetNdexClient).toHaveBeenCalledWith('test.ndexbio.org', 'tok')
  })

  it('does not fetch while Keycloak is still initializing', async () => {
    mockUseAuth.mockReturnValue(initializing)

    renderHook(() => useFolderContents('f-1'), { wrapper })

    // Give SWR a tick; no request should have fired
    await new Promise((r) => setTimeout(r, 50))
    expect(getFolderList).not.toHaveBeenCalled()
  })

  it('surfaces auth errors without console noise', async () => {
    mockUseAuth.mockReturnValue(anonymous)
    const denied = Object.assign(new Error('denied'), { statusCode: 401 })
    getFolderList.mockRejectedValue(denied)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useFolderContents('f-1'), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('logs unexpected errors', async () => {
    mockUseAuth.mockReturnValue(anonymous)
    const boom = Object.assign(new Error('boom'), { statusCode: 500 })
    getFolderList.mockRejectedValue(boom)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useFolderContents('f-1'), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('fetches the home folder when folderId is null', async () => {
    mockUseAuth.mockReturnValue(signedIn)

    const { result } = renderHook(() => useFolderContents(null), { wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(getFolderList).toHaveBeenCalledWith('home', undefined, 'compact')
  })
})

describe('useFolder', () => {
  let getFolder: jest.Mock

  beforeEach(() => {
    getFolder = jest
      .fn()
      .mockResolvedValue({ uuid: 'f-1', name: 'My Folder', owner: 'alice' })
    mockGetNdexClient.mockReturnValue({ files: { getFolder } })
  })

  it('fetches folder metadata for anonymous viewers with an access key', async () => {
    mockUseAuth.mockReturnValue(anonymous)

    const { result } = renderHook(() => useFolder('f-1', 'secret-key'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.folder).toBeTruthy())
    expect(getFolder).toHaveBeenCalledWith('f-1', 'secret-key')
  })

  it('surfaces not-found errors without console noise', async () => {
    mockUseAuth.mockReturnValue(anonymous)
    const missing = Object.assign(new Error('missing'), { statusCode: 404 })
    getFolder.mockRejectedValue(missing)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useFolder('f-1'), { wrapper })

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
