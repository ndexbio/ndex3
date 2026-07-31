import React from 'react'
import { render, screen } from '@testing-library/react'
import HomePage from './page'

// Mock the base-path hook so we can drive subdirectory-deployment behaviour.
let mockBasePath = ''
jest.mock('@/lib/contexts/ConfigContext', () => ({
  useBasePath: () => mockBasePath,
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
  beforeEach(() => {
    mockBasePath = ''
    mockReplace.mockClear()
    setPath('/')
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
    // redirect re-rendering the component (path is a one-time snapshot).
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
})
