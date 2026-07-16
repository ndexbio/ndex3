import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ActionDropdown from './ActionDropdown'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { resolveNetworkTarget } from '@/lib/utils/shortcut-resolver'

const mockOpenInCytoscape = jest.fn()
const mockCopyFile = jest.fn()
const mockDownloadNetwork = jest.fn()

jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: jest.fn(),
}))
jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: () => ({
    ndexBaseUrl: 'test.ndexbio.org',
    cytoscapeWebUrl: 'https://web.cytoscape.org',
  }),
}))
jest.mock('@/lib/contexts/DialogContext', () => ({
  useDialogs: () => ({
    openRenameFolderDialog: jest.fn(),
    openMoveFolderDialog: jest.fn(),
    openEditNetworkPropertiesDialog: jest.fn(),
    openEditFolderPropertiesDialog: jest.fn(),
    openRenameShortcutDialog: jest.fn(),
    openCreateDOIDialog: jest.fn(),
    openShareDialog: jest.fn(),
  }),
}))
jest.mock('@/lib/contexts/ToastContext', () => ({
  useToast: () => ({ addToast: jest.fn() }),
}))
jest.mock('@/hooks/use-network-download', () => ({
  useNetworkDownload: () => ({
    downloadNetwork: mockDownloadNetwork,
    downloadMultipleNetworks: jest.fn(),
    isDownloading: {},
  }),
}))
jest.mock('@/hooks/use-network-copy', () => ({
  useNetworkCopy: () => ({ copyFile: mockCopyFile, isCopying: {} }),
}))
jest.mock('@/hooks/use-network-readonly', () => ({
  useNetworkReadOnly: () => ({ setNetworkReadOnly: jest.fn(), isUpdating: {} }),
}))
jest.mock('@/hooks/use-cyndex', () => ({
  useCyNDEx: () => ({
    openInCytoscape: mockOpenInCytoscape,
    isOpening: {},
    isCytoscapeAvailable: true,
    isCheckingCytoscape: false,
  }),
}))
jest.mock('@/lib/utils/shortcut-resolver', () => ({
  ...jest.requireActual('@/lib/utils/shortcut-resolver'),
  resolveNetworkTarget: jest.fn(),
}))

const mockUseAuth = useAuth as jest.Mock
const mockResolve = resolveNetworkTarget as jest.Mock

const ITEM_ID = 'item-1'

const anonymousAuth = { user: null, isAuthenticated: false, token: '' }
const aliceAuth = {
  user: { userName: 'alice' },
  isAuthenticated: true,
  token: 'tok',
}

const networkItem: FileItemBase = {
  uuid: ITEM_ID,
  name: 'My Network',
  type: NDExFileType.NETWORK,
  modificationTime: 0,
  owner: 'alice',
  attributes: {},
}

const folderItem: FileItemBase = {
  uuid: ITEM_ID,
  name: 'My Folder',
  type: NDExFileType.FOLDER,
  modificationTime: 0,
  owner: 'alice',
  attributes: {},
}

const folderShortcutItem: FileItemBase = {
  uuid: ITEM_ID,
  name: 'Folder Shortcut',
  type: NDExFileType.SHORTCUT,
  modificationTime: 0,
  owner: 'alice',
  attributes: { target: 'f-9', target_type: NDExFileType.FOLDER },
}

const networkShortcutItem: FileItemBase = {
  uuid: ITEM_ID,
  name: 'Network Shortcut',
  type: NDExFileType.SHORTCUT,
  modificationTime: 0,
  owner: 'alice',
  attributes: { target: 'n-9', target_type: NDExFileType.NETWORK },
}

const renderDropdown = (
  item: FileItemBase,
  dropdownType: NDExFileType,
  extraProps: Partial<React.ComponentProps<typeof ActionDropdown>> = {},
) =>
  render(
    <ActionDropdown
      openDropdownId={ITEM_ID}
      dropdownType={dropdownType}
      item={item}
      tabState={MyAccountTabType.MYNETWORKS}
      currentFolderId="folder-0"
      onClose={jest.fn()}
      onDelete={jest.fn()}
      onRestore={jest.fn()}
      onCreateShortcut={jest.fn()}
      {...extraProps}
    />,
  )

const buttonFor = (label: string): HTMLButtonElement =>
  screen.getByText(label).closest('button') as HTMLButtonElement

beforeEach(() => {
  // Anchor element the dropdown positions itself against
  document.body.innerHTML = `<button data-dropdown-id="${ITEM_ID}"></button>`
  mockResolve.mockReset()
  mockOpenInCytoscape.mockReset()
  mockCopyFile.mockReset()
  mockDownloadNetwork.mockReset()
})

describe('ActionDropdown — folder rows never get network actions', () => {
  it.each([
    ['folder', folderItem, NDExFileType.FOLDER],
    ['shortcut-to-folder', folderShortcutItem, NDExFileType.FOLDER],
  ])('%s row shows the folder menu for anonymous viewers (fallthrough bug fix)', (_label, item, type) => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    renderDropdown(item, type)

    expect(screen.queryByText('Download')).not.toBeInTheDocument()
    expect(screen.queryByText('Open in Cytoscape Desktop')).not.toBeInTheDocument()
    expect(screen.queryByText('Open in Cytoscape Web')).not.toBeInTheDocument()
    // Folder edit actions present but greyed out
    expect(buttonFor('Share')).toBeDisabled()
    expect(buttonFor('Move')).toBeDisabled()
  })

  it('shortcut-to-folder gets the folder menu even when dropdownType says NETWORK', () => {
    mockUseAuth.mockReturnValue(aliceAuth)
    renderDropdown(folderShortcutItem, NDExFileType.NETWORK)

    expect(screen.queryByText('Download')).not.toBeInTheDocument()
    expect(screen.queryByText('Open in Cytoscape Desktop')).not.toBeInTheDocument()
  })
})

describe('ActionDropdown — anonymous viewers', () => {
  beforeEach(() => mockUseAuth.mockReturnValue(anonymousAuth))

  it('network row: READ actions enabled, edit actions greyed out (not hidden)', () => {
    renderDropdown(networkItem, NDExFileType.NETWORK)

    // READ actions available
    expect(buttonFor('Open in Cytoscape Desktop')).toBeEnabled()
    expect(buttonFor('Open in Cytoscape Web')).toBeEnabled()
    expect(buttonFor('Download')).toBeEnabled()

    // Edit actions visible but disabled with the sign-in tooltip
    for (const label of ['Edit Properties', 'Make a Copy', 'Share', 'Move', 'Add a Shortcut', 'Move to Trash']) {
      const button = buttonFor(label)
      expect(button).toBeDisabled()
      expect(button.parentElement).toHaveAttribute('title', 'Sign in to use this feature')
    }
  })

  it('owner-only items (Request DOI, read-only toggle) are not offered', () => {
    renderDropdown(networkItem, NDExFileType.NETWORK)
    expect(screen.queryByText('Request DOI')).not.toBeInTheDocument()
    expect(screen.queryByText('Set as Read-only')).not.toBeInTheDocument()
  })
})

describe('ActionDropdown — signed-in owner', () => {
  beforeEach(() => mockUseAuth.mockReturnValue(aliceAuth))

  it('network row: everything enabled', () => {
    renderDropdown(networkItem, NDExFileType.NETWORK)

    for (const label of ['Edit Properties', 'Make a Copy', 'Share', 'Move', 'Add a Shortcut', 'Move to Trash', 'Request DOI', 'Set as Read-only']) {
      expect(buttonFor(label)).toBeEnabled()
    }
  })

  it('folder row: management actions enabled', () => {
    renderDropdown(folderItem, NDExFileType.FOLDER)
    for (const label of ['Edit Properties', 'Share', 'Move', 'Add Shortcut', 'Move to Trash']) {
      expect(buttonFor(label)).toBeEnabled()
    }
  })
})

describe('ActionDropdown — signed-in non-owner', () => {
  beforeEach(() =>
    mockUseAuth.mockReturnValue({
      user: { userName: 'bob' },
      isAuthenticated: true,
      token: 'tok',
    }),
  )

  it('network row: read + copy/shortcut enabled, owner actions gated', () => {
    renderDropdown(networkItem, NDExFileType.NETWORK)

    expect(buttonFor('Download')).toBeEnabled()
    // Writing into the VIEWER's own account is allowed
    expect(buttonFor('Make a Copy')).toBeEnabled()
    expect(buttonFor('Add a Shortcut')).toBeEnabled()
    // Editing alice's network is not
    expect(buttonFor('Edit Properties')).toBeDisabled()
    expect(buttonFor('Share')).toBeDisabled()
    expect(buttonFor('Move')).toBeDisabled()
    // Move to Trash stays hidden for signed-in non-owners
    expect(screen.queryByText('Move to Trash')).not.toBeInTheDocument()
  })
})

describe('ActionDropdown — shortcut target resolution', () => {
  it('shows download progress while a shortcut target is downloading', async () => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    mockResolve.mockResolvedValue({ networkId: 'n-9' })

    let finishDownload!: (result: { success: boolean; networkId: string }) => void
    mockDownloadNetwork.mockReturnValue(
      new Promise((resolve) => {
        finishDownload = resolve
      }),
    )

    renderDropdown(networkShortcutItem, NDExFileType.NETWORK)
    fireEvent.click(buttonFor('Download'))
    fireEvent.click(buttonFor('CX Format'))

    await waitFor(() => {
      expect(screen.getByText('Downloading...')).toBeInTheDocument()
      expect(buttonFor('CX Format')).toBeDisabled()
      expect(mockDownloadNetwork).toHaveBeenCalledWith(
        'n-9',
        'Network Shortcut',
        { format: 'CX' },
        undefined,
      )
    })

    finishDownload({ success: true, networkId: 'n-9' })
    await waitFor(() => {
      expect(screen.queryByText('Downloading...')).not.toBeInTheDocument()
    })
  })

  it('passes the page access key to Cytoscape Desktop', () => {
    mockUseAuth.mockReturnValue(anonymousAuth)

    renderDropdown(networkItem, NDExFileType.NETWORK, {
      accessKey: 'page-key',
    })
    fireEvent.click(buttonFor('Open in Cytoscape Desktop'))

    expect(mockOpenInCytoscape).toHaveBeenCalledWith(
      ITEM_ID,
      'My Network',
      NDExFileType.NETWORK,
      {},
      'page-key',
    )
  })

  it('Open in Cytoscape Web resolves the shortcut TARGET uuid', async () => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    mockResolve.mockResolvedValue({ networkId: 'n-9' })
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

    renderDropdown(networkShortcutItem, NDExFileType.NETWORK)
    fireEvent.click(buttonFor('Open in Cytoscape Web'))

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith(
        ITEM_ID,
        NDExFileType.SHORTCUT,
        networkShortcutItem.attributes,
        expect.objectContaining({ ndexBaseUrl: 'test.ndexbio.org' }),
      )
      expect(openSpy).toHaveBeenCalledWith(
        'https://web.cytoscape.org/0/networks/n-9',
        '_blank',
        'noopener,noreferrer',
      )
    })
    openSpy.mockRestore()
  })

  it('adds the page access key to the Cytoscape Web URL', async () => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    mockResolve.mockResolvedValue({ networkId: ITEM_ID })
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

    renderDropdown(networkItem, NDExFileType.NETWORK, {
      accessKey: 'shared key/+',
    })
    fireEvent.click(buttonFor('Open in Cytoscape Web'))

    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith(
        ITEM_ID,
        NDExFileType.NETWORK,
        networkItem.attributes,
        expect.objectContaining({ accessKey: 'shared key/+' }),
      )
      expect(openSpy).toHaveBeenCalledWith(
        'https://web.cytoscape.org/0/networks/item-1?accesskey=shared%20key%2F%2B',
        '_blank',
        'noopener,noreferrer',
      )
    })
    openSpy.mockRestore()
  })
})

describe('ActionDropdown — page access key propagation', () => {
  it('passes the page access key when making a copy', async () => {
    mockUseAuth.mockReturnValue(aliceAuth)
    mockCopyFile.mockResolvedValue({ success: true })

    renderDropdown(networkItem, NDExFileType.NETWORK, {
      accessKey: 'page-key',
    })
    fireEvent.click(buttonFor('Make a Copy'))

    await waitFor(() => {
      expect(mockCopyFile).toHaveBeenCalledWith(
        ITEM_ID,
        'My Network',
        NDExFileType.NETWORK,
        'folder-0',
        'page-key',
      )
    })
  })
})
