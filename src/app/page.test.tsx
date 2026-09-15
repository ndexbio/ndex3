import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import HomePage from './page'

// Mock the config hooks so we can drive subdirectory deployments and the
// optional metrics sink.
let mockBasePath = ''
let mockConfig: { metricsUrl?: string } = {}
jest.mock('@/lib/contexts/ConfigContext', () => ({
  useBasePath: () => mockBasePath,
  useConfig: () => mockConfig,
}))

// useRouter is used only for the legacy networkset redirect.
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

// Stub the heavy destination components down to identifiable markers so the
// test asserts *which* view the root router chose, not their internals.
jest.mock('@/app/_components/Home', () => ({
  __esModule: true,
  default: () => <div data-testid="home" />,
}))
jest.mock('@/app/folders/_components/FolderViewer', () => ({
  __esModule: true,
  default: ({ uuid }: { uuid: string }) => <div data-testid="folder-viewer">{uuid}</div>,
}))
jest.mock('@/app/users/_components/UserPublicPage', () => ({
  __esModule: true,
  default: ({ uuid }: { uuid: string }) => <div data-testid="user-page">{uuid}</div>,
}))

// Set the browser URL the way the static rewrite leaves it (the "/" document is
// served, but window.location.pathname is the true deep-link path).
function setPath(pathname: string) {
  window.history.pushState({}, '', pathname)
}

describe('HomePage root client router', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    mockBasePath = ''
    mockConfig = { metricsUrl: '/metrics' }
    mockReplace.mockClear()
    setPath('/')
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 })
    global.fetch = fetchMock as unknown as typeof fetch
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders FolderViewer for a /folders/{uuid}/ deep link without ever rendering Home', () => {
    setPath('/folders/b4593a0e-80dd-11f1-bee9-005056ae6f73/')
    render(<HomePage />)

    expect(screen.getByTestId('folder-viewer')).toHaveTextContent(
      'b4593a0e-80dd-11f1-bee9-005056ae6f73',
    )
    // The regression this guards: Home must never render for a folder URL.
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('renders FolderViewer for a folder link without trailing slash', () => {
    setPath('/folders/abc-123')
    render(<HomePage />)

    expect(screen.getByTestId('folder-viewer')).toHaveTextContent('abc-123')
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('strips basePath before matching so subdirectory deployments resolve folders', () => {
    mockBasePath = '/ndex3'
    setPath('/ndex3/folders/abc-123/')
    render(<HomePage />)

    expect(screen.getByTestId('folder-viewer')).toHaveTextContent('abc-123')
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('renders UserPublicPage for a /users/{uuid}/ deep link', () => {
    setPath('/users/user-uuid/')
    render(<HomePage />)

    expect(screen.getByTestId('user-page')).toHaveTextContent('user-uuid')
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('canonicalizes legacy /networkset/{uuid} to /folders/{uuid} and renders the folder view', () => {
    setPath('/networkset/legacy-uuid/')
    render(<HomePage />)

    // Redirects the URL to the canonical /folders form...
    expect(mockReplace).toHaveBeenCalledWith('/folders/legacy-uuid')
    // ...and renders the folder view immediately, without depending on the
    // redirect re-rendering the component (route is a one-time snapshot).
    expect(screen.getByTestId('folder-viewer')).toHaveTextContent('legacy-uuid')
    expect(screen.queryByTestId('home')).not.toBeInTheDocument()
  })

  it('falls back to Home for the root path', () => {
    setPath('/')
    render(<HomePage />)

    expect(screen.getByTestId('home')).toBeInTheDocument()
    expect(screen.queryByTestId('folder-viewer')).not.toBeInTheDocument()
  })

  it('does not render FolderViewer for the placeholder UUID', () => {
    setPath('/folders/placeholder/')
    render(<HomePage />)

    expect(screen.queryByTestId('folder-viewer')).not.toBeInTheDocument()
    // placeholder falls through to Home (no real folder to show)
    expect(screen.getByTestId('home')).toBeInTheDocument()
  })

  describe('unrecognized routes', () => {
    it('renders the not-found view instead of the home page', () => {
      setPath('/doesnotexist/')
      render(<HomePage />)

      expect(screen.getByTestId('page-not-found')).toBeInTheDocument()
      // The bug from issue #48: junk URLs used to render the home page.
      expect(screen.queryByTestId('home')).not.toBeInTheDocument()
    })

    it('renders the not-found view for a known prefix with the wrong shape', () => {
      setPath('/users/abc/extra/')
      render(<HomePage />)

      expect(screen.getByTestId('page-not-found')).toBeInTheDocument()
      expect(screen.queryByTestId('user-page')).not.toBeInTheDocument()
    })

    it('echoes the requested path, with basePath stripped', () => {
      mockBasePath = '/ndex3'
      setPath('/ndex3/doesnotexist/')
      render(<HomePage />)

      expect(screen.getByTestId('page-not-found-path')).toHaveTextContent(
        '/doesnotexist/',
      )
    })

    it('sends exactly one metrics tracking request carrying the requested path', async () => {
      setPath('/doesnotexist/')
      render(<HomePage />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).toBe(
        '/metrics/not-found?url=%2Fdoesnotexist%2F',
      )
    })

    // Shared links carry ?accesskey=<secret>. A malformed one classifies as
    // unknown, and the key must never reach the server's access log.
    it('never forwards the query string, so an access key cannot leak into the log', async () => {
      setPath('/networkset/?accesskey=SUPERSECRET')
      render(<HomePage />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).not.toContain('SUPERSECRET')
    })

    it('prefixes the tracking request with basePath on a subdirectory deployment', async () => {
      mockBasePath = '/ndex3'
      setPath('/ndex3/doesnotexist/')
      render(<HomePage />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).toBe(
        '/ndex3/metrics/not-found?url=%2Fdoesnotexist%2F',
      )
    })

    it('uses the default endpoint when config omits metricsUrl', async () => {
      mockConfig = {}
      setPath('/doesnotexist/')
      render(<HomePage />)

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).toBe(
        '/metrics/not-found?url=%2Fdoesnotexist%2F',
      )
    })

    it('still renders the view when tracking is turned off, and sends nothing', () => {
      // An explicit blank is how a deployment opts out; an absent key is not.
      mockConfig = { metricsUrl: '' }
      setPath('/doesnotexist/')
      render(<HomePage />)

      expect(screen.getByTestId('page-not-found')).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('still renders the view when the tracking request fails', async () => {
      fetchMock.mockRejectedValue(new Error('blocked by client'))
      setPath('/doesnotexist/')
      render(<HomePage />)

      expect(screen.getByTestId('page-not-found')).toBeInTheDocument()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(screen.getByTestId('page-not-found')).toBeInTheDocument()
    })

    it('does not send a tracking request for a route it recognizes', () => {
      setPath('/folders/abc-123/')
      render(<HomePage />)

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
