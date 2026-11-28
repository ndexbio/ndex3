import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ActionDropdown from './ActionDropdown'
import { MyAccountTabType } from '@/types/ui/myAccount'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { resolveNetworkTarget } from '@/lib/utils/shortcut-resolver'

const mockOpenInCytoscape = jest.fn()
const mockCopyFile = jest.fn()
const mockDownloadNetwork = jest.fn()

jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: jest.fn(),
}))
// Config is a reconfigurable mock so gate tests can set thresholds per-test.
// We default to the original static mock.
jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: jest.fn(),
}))
const mockOpenCreateDOIDialog = jest.fn()
const mockOpenAddReferenceDialog = jest.fn()
const mockOpenCancelDOIDialog = jest.fn()

jest.mock('@/lib/contexts/DialogContext', () => ({
  useDialogs: () => ({
    openRenameFolderDialog: jest.fn(),
    openMoveFolderDialog: jest.fn(),
    openEditNetworkPropertiesDialog: jest.fn(),
    openEditFolderPropertiesDialog: jest.fn(),
    openRenameShortcutDialog: jest.fn(),
    openCreateDOIDialog: mockOpenCreateDOIDialog,
    openAddReferenceDialog: mockOpenAddReferenceDialog,
    openCancelDOIDialog: mockOpenCancelDOIDialog,
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
const mockUseConfig = useConfig as jest.Mock
const mockResolve = resolveNetworkTarget as jest.Mock

const BASE_CONFIG = {
  ndexBaseUrl: 'test.ndexbio.org',
  cytoscapeWebUrl: 'https://web.cytoscape.org',
}

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
  // Default config: no thresholds set (matches the original static mock).
  mockUseConfig.mockReturnValue({ ...BASE_CONFIG })
  mockResolve.mockReset()
  mockOpenInCytoscape.mockReset()
  mockCopyFile.mockReset()
  mockDownloadNetwork.mockReset()
  mockOpenCreateDOIDialog.mockReset()
  mockOpenAddReferenceDialog.mockReset()
  mockOpenCancelDOIDialog.mockReset()
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

describe('ActionDropdown — Open in Cytoscape Web element-count gate (GI-35)', () => {
  // Use an authenticated owner so nothing else greys the button; the gate is
  // the only thing under test here.
  beforeEach(() => mockUseAuth.mockReturnValue(aliceAuth))

  const withCounts = (
    counts: { edges?: unknown; nodes?: unknown; edgeCount?: unknown; nodeCount?: unknown },
    attributes: Record<string, unknown> = {},
  ): FileItemBase =>
    ({
      uuid: ITEM_ID,
      name: 'Sized Network',
      type: NDExFileType.NETWORK,
      modificationTime: 0,
      owner: 'alice',
      attributes,
      ...counts,
    } as unknown as FileItemBase)

  const setThresholds = (
    maxNetworkElementsThreshold?: number,
    maxEdgeCountThreshold?: number,
  ) =>
    mockUseConfig.mockReturnValue({
      ...BASE_CONFIG,
      ...(maxNetworkElementsThreshold !== undefined ? { maxNetworkElementsThreshold } : {}),
      ...(maxEdgeCountThreshold !== undefined ? { maxEdgeCountThreshold } : {}),
    })

  const webButton = () => buttonFor('Open in Cytoscape Web')

  it('small network is enabled under the ticket defaults', () => {
    setThresholds(26000, 20000)
    renderDropdown(withCounts({ edges: 68 }, { nodeCount: 55 }), NDExFileType.NETWORK)
    expect(webButton()).toBeEnabled()
  })

  it('reads the real payload shape (top-level edges + attributes.nodeCount)', () => {
    // Regression for the reported bug: edges lived at top level, so an accessor
    // that only checked edgeCount read edges as 0 and never gated.
    setThresholds(2000, 67)
    renderDropdown(withCounts({ edges: 68 }, { nodeCount: 55 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('element cap alone trips the gate (edges under its own cap)', () => {
    setThresholds(100, 20000)
    // 60 + 41 = 101 > 100 elements; edges 41 < 20000.
    renderDropdown(withCounts({ edges: 41 }, { nodeCount: 60 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('edge cap alone trips the gate (total under the element cap)', () => {
    setThresholds(26000, 50)
    // edges 51 > 50; total 51 << 26000.
    renderDropdown(withCounts({ edges: 51 }, { nodeCount: 0 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('exactly at both caps is still enabled (strict >)', () => {
    setThresholds(600, 600)
    // 300 + 300 = 600 (not > 600); edges 300 (not > 600).
    renderDropdown(withCounts({ edges: 300 }, { nodeCount: 300 }), NDExFileType.NETWORK)
    expect(webButton()).toBeEnabled()
  })

  it('one element over the element cap disables', () => {
    setThresholds(600, 100000)
    // 300 + 301 = 601 > 600.
    renderDropdown(withCounts({ edges: 301 }, { nodeCount: 300 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('one edge over the edge cap disables', () => {
    setThresholds(100000, 600)
    // edges 601 > 600.
    renderDropdown(withCounts({ edges: 601 }, { nodeCount: 0 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('a genuinely empty (0-edge) network stays enabled', () => {
    setThresholds(600, 600)
    renderDropdown(withCounts({ edges: 0 }, { nodeCount: 3 }), NDExFileType.NETWORK)
    expect(webButton()).toBeEnabled()
  })

  it('a real 0 at a higher-priority location is respected, not skipped', () => {
    // Top-level edges is 0; must NOT fall through to attributes.edgeCount (999).
    setThresholds(600, 600)
    renderDropdown(
      withCounts({ edges: 0 }, { edgeCount: 999, nodeCount: 3 }),
      NDExFileType.NETWORK,
    )
    expect(webButton()).toBeEnabled()
  })

  it('coerces string counts', () => {
    setThresholds(2000, 67)
    renderDropdown(
      withCounts({ edges: '68' as unknown as number }, { nodeCount: '55' }),
      NDExFileType.NETWORK,
    )
    expect(webButton()).toBeDisabled()
  })

  it('falls back to attributes when top-level counts are absent', () => {
    setThresholds(2000, 67)
    renderDropdown(withCounts({}, { edges: 68, nodeCount: 55 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('uses default thresholds when config has none (large network gated)', () => {
    // No thresholds -> defaults 26000 / 20000. 25000 edges > 20000.
    mockUseConfig.mockReturnValue({ ...BASE_CONFIG })
    renderDropdown(withCounts({ edges: 25000 }, { nodeCount: 0 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('uses default thresholds when config has none (normal network enabled)', () => {
    mockUseConfig.mockReturnValue({ ...BASE_CONFIG })
    renderDropdown(withCounts({ edges: 500 }, { nodeCount: 800 }), NDExFileType.NETWORK)
    expect(webButton()).toBeEnabled()
  })

  it('respects an explicit 0 threshold rather than applying a default', () => {
    // maxEdgeCount 0 means any network with >0 edges is gated.
    setThresholds(0, 0)
    renderDropdown(withCounts({ edges: 1 }, { nodeCount: 0 }), NDExFileType.NETWORK)
    expect(webButton()).toBeDisabled()
  })

  it('a shortcut row WITH denormalized counts is gated (real backend shape)', () => {
    // The backend copies the target network's counts onto the shortcut row
    // (top-level `edges`), same as target_status/target_type. So shortcuts to
    // large networks are gated correctly — no async target resolution needed.
    setThresholds(26000, 20000)
    const giantShortcut = {
      uuid: ITEM_ID,
      type: NDExFileType.SHORTCUT,
      name: 'testtest',
      modificationTime: 0,
      owner: 'alice',
      visibility: 'PRIVATE',
      edges: 1258880,
      attributes: {
        target_type: NDExFileType.NETWORK,
        target_status: 'ACTIVE',
        target: 'target-uuid',
      },
    } as unknown as FileItemBase
    renderDropdown(giantShortcut, NDExFileType.NETWORK)
    const button = webButton()
    expect(button).toBeDisabled()
    expect(button.parentElement).toHaveAttribute(
      'title',
      expect.stringContaining('1,258,880'),
    )
  })

  it('a shortcut row with NO counts is not gated (nothing to measure)', () => {
    // Only relevant if a shortcut somehow arrives without denormalized counts —
    // then there is nothing to measure and the gate correctly stays off.
    setThresholds(1, 1)
    renderDropdown(networkShortcutItem, NDExFileType.NETWORK)
    expect(webButton()).toBeEnabled()
  })

  it('disabled button carries the explanatory tooltip with formatted counts', () => {
    setThresholds(2000, 67)
    renderDropdown(withCounts({ edges: 21000 }, { nodeCount: 10000 }), NDExFileType.NETWORK)
    const button = webButton()
    expect(button).toBeDisabled()
    // 10000 + 21000 = 31,000 total elements, 21,000 edges (locale-formatted).
    expect(button.parentElement).toHaveAttribute(
      'title',
      expect.stringContaining('31,000'),
    )
    expect(button.parentElement).toHaveAttribute(
      'title',
      expect.stringContaining('21,000'),
    )
    expect(button.parentElement).toHaveAttribute(
      'title',
      expect.stringContaining('Cytoscape Desktop'),
    )
  })

  it('enabled button has no gate tooltip', () => {
    setThresholds(26000, 20000)
    renderDropdown(withCounts({ edges: 10 }, { nodeCount: 10 }), NDExFileType.NETWORK)
    const button = webButton()
    expect(button).toBeEnabled()
    // No large-network tooltip on the wrapper.
    const title = button.parentElement?.getAttribute('title') ?? ''
    expect(title).not.toContain('too large')
  })

  it('a disabled Web button does not open a window when clicked', () => {
    setThresholds(2000, 67)
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    renderDropdown(withCounts({ edges: 68 }, { nodeCount: 55 }), NDExFileType.NETWORK)

    fireEvent.click(webButton())
    expect(openSpy).not.toHaveBeenCalled()
    expect(mockResolve).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('the gate does not affect Cytoscape Desktop (only the Web action)', () => {
    setThresholds(2000, 67)
    renderDropdown(withCounts({ edges: 68 }, { nodeCount: 55 }), NDExFileType.NETWORK)
    expect(buttonFor('Open in Cytoscape Web')).toBeDisabled()
    expect(buttonFor('Open in Cytoscape Desktop')).toBeEnabled()
  })
})
describe('ActionDropdown — Add Reference on pre-certified networks', () => {
  beforeEach(() => mockUseAuth.mockReturnValue(aliceAuth))

  /** DOI minted, but the reference is still missing. */
  const preCertifiedNetwork: FileItemBase = {
    ...networkItem,
    doi: '10.18119/N9TEST',
    isCertified: false,
  }

  /** A network that completed the flow — certified, published, locked. */
  const certifiedNetwork: FileItemBase = {
    ...networkItem,
    doi: '10.18119/N9TEST',
    isCertified: true,
  }

  it('offers Add Reference for a pre-certified network the viewer owns', () => {
    renderDropdown(preCertifiedNetwork, NDExFileType.NETWORK)
    expect(buttonFor('Add Reference')).toBeEnabled()
  })

  it('opens the Add Reference dialog for that network when clicked', () => {
    renderDropdown(preCertifiedNetwork, NDExFileType.NETWORK)

    fireEvent.click(buttonFor('Add Reference'))

    expect(mockOpenAddReferenceDialog).toHaveBeenCalledWith(ITEM_ID, undefined)
  })

  // The server allows a reference while hasDOI && !isCertified, which includes
  // an assigned DOI on a network that was never certified.
  it('offers Add Reference once a DOI is assigned but the network is not certified', () => {
    renderDropdown(
      { ...networkItem, doi: '10.18119/N9TEST', isCertified: false },
      NDExFileType.NETWORK,
    )
    expect(buttonFor('Add Reference')).toBeEnabled()
  })

  it('hides Add Reference once the network is certified', () => {
    renderDropdown(certifiedNetwork, NDExFileType.NETWORK)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  it('hides Add Reference for a network with no DOI request', () => {
    renderDropdown(networkItem, NDExFileType.NETWORK)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  // The server silently does nothing for a non-admin caller rather than
  // reporting an error, so a non-owner must never see the action at all.
  it('hides Add Reference from a non-owner', () => {
    renderDropdown({ ...preCertifiedNetwork, owner: 'bob' }, NDExFileType.NETWORK)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  it('hides Add Reference from anonymous viewers', () => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    renderDropdown(preCertifiedNetwork, NDExFileType.NETWORK)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  // DOI is a network-only concept. Even a folder or shortcut carrying stray
  // doi/isCertified fields must never offer the action.
  it.each([
    ['a folder row', { ...folderItem, doi: 'pending', isCertified: false }, NDExFileType.FOLDER],
    [
      'a shortcut row',
      { ...networkShortcutItem, doi: 'pending', isCertified: false },
      NDExFileType.NETWORK,
    ],
  ])('hides Add Reference on %s', (_label, item, type) => {
    renderDropdown(item as FileItemBase, type)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  describe('Request DOI stays blocked while a request is pending', () => {
    it('disables Request DOI for a pending request', () => {
      renderDropdown(preCertifiedNetwork, NDExFileType.NETWORK)
      expect(buttonFor('Request DOI')).toBeDisabled()
    })

    it('does not open the DOI dialog when the disabled item is clicked', () => {
      renderDropdown(preCertifiedNetwork, NDExFileType.NETWORK)

      fireEvent.click(buttonFor('Request DOI'))

      expect(mockOpenCreateDOIDialog).not.toHaveBeenCalled()
    })

    it('disables Request DOI for a network whose mint failed', () => {
      // The server rejects a second request while the DOI reads "Pending".
      renderDropdown(
        { ...networkItem, doi: 'Pending', isCertified: false },
        NDExFileType.NETWORK,
      )
      expect(buttonFor('Request DOI')).toBeDisabled()
    })

    it('still enables Request DOI for a network with no DOI', () => {
      renderDropdown(networkItem, NDExFileType.NETWORK)
      expect(buttonFor('Request DOI')).toBeEnabled()
    })
  })
})

/**
 * A DOI stuck at "Pending" means minting failed and left the network locked.
 * Cancelling is the only way out, and the server accepts it in no other state.
 */
describe('ActionDropdown — Cancel DOI Request after a failed mint', () => {
  beforeEach(() => mockUseAuth.mockReturnValue(aliceAuth))

  const stuckNetwork: FileItemBase = {
    ...networkItem,
    doi: 'Pending',
    isCertified: false,
  }

  it('offers Cancel DOI Request on a network whose mint failed', () => {
    renderDropdown(stuckNetwork, NDExFileType.NETWORK)
    expect(buttonFor('Cancel DOI Request')).toBeEnabled()
  })

  it('opens the cancel dialog with the network name when clicked', () => {
    renderDropdown(stuckNetwork, NDExFileType.NETWORK)

    fireEvent.click(buttonFor('Cancel DOI Request'))

    expect(mockOpenCancelDOIDialog).toHaveBeenCalledWith(ITEM_ID, 'My Network', undefined)
  })

  it('does not offer Add Reference on a stuck network', () => {
    // A failed mint is not the same as pre-certified: there is nothing to add a
    // reference to until the request is cleared and remade.
    renderDropdown(stuckNetwork, NDExFileType.NETWORK)
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  it.each([
    ['a minted DOI', { doi: '10.18119/N9TEST', isCertified: false }],
    ['a certified network', { doi: '10.18119/N9TEST', isCertified: true }],
    ['a network with no DOI', {}],
  ])('hides Cancel DOI Request for %s', (_label, extra) => {
    renderDropdown({ ...networkItem, ...extra } as FileItemBase, NDExFileType.NETWORK)
    expect(screen.queryByText('Cancel DOI Request')).not.toBeInTheDocument()
  })

  it('hides Cancel DOI Request from a non-owner', () => {
    renderDropdown({ ...stuckNetwork, owner: 'bob' }, NDExFileType.NETWORK)
    expect(screen.queryByText('Cancel DOI Request')).not.toBeInTheDocument()
  })

  it('hides Cancel DOI Request from anonymous viewers', () => {
    mockUseAuth.mockReturnValue(anonymousAuth)
    renderDropdown(stuckNetwork, NDExFileType.NETWORK)
    expect(screen.queryByText('Cancel DOI Request')).not.toBeInTheDocument()
  })

  it.each([
    ['a folder row', { ...folderItem, doi: 'Pending' }, NDExFileType.FOLDER],
    ['a shortcut row', { ...networkShortcutItem, doi: 'Pending' }, NDExFileType.NETWORK],
  ])('hides Cancel DOI Request on %s', (_label, item, type) => {
    renderDropdown(item as FileItemBase, type)
    expect(screen.queryByText('Cancel DOI Request')).not.toBeInTheDocument()
  })
})

/**
 * The server locks a network the moment a DOI request is filed — including one
 * stuck by a failed mint — so the menu must block exactly what the API blocks.
 */
describe('ActionDropdown — restrictions on a network with a DOI', () => {
  beforeEach(() => mockUseAuth.mockReturnValue(aliceAuth))

  const states: [string, Partial<FileItemBase>][] = [
    ['pre-certified', { doi: '10.18119/N9TEST', isCertified: false, isReadOnly: true }],
    ['certified', { doi: '10.18119/N9TEST', isCertified: true, isReadOnly: true }],
    ['a failed mint', { doi: 'Pending', isCertified: false, isReadOnly: true }],
  ]

  describe.each(states)('%s', (_label, extra) => {
    const withDOI = () => ({ ...networkItem, ...extra }) as FileItemBase

    it('cannot have its read-only flag removed', () => {
      renderDropdown(withDOI(), NDExFileType.NETWORK)
      expect(buttonFor('Remove Read-only')).toBeDisabled()
    })

    it('blames the DOI rather than read-only', () => {
      // Blaming read-only invites the user to turn off a flag they are not
      // permitted to turn off. MenuItemButton puts the tooltip on a wrapper.
      renderDropdown(withDOI(), NDExFileType.NETWORK)

      const tooltip = buttonFor('Remove Read-only').closest('[title]')
      expect(tooltip).toHaveAttribute('title', "Networks with a DOI can't be made editable")
    })

    it('cannot have its properties edited', () => {
      renderDropdown(withDOI(), NDExFileType.NETWORK)
      expect(buttonFor('Edit Properties')).toBeDisabled()
    })

    it('cannot be moved to trash', () => {
      renderDropdown(withDOI(), NDExFileType.NETWORK)
      expect(buttonFor('Move to Trash')).toBeDisabled()
    })

    it('cannot request another DOI', () => {
      renderDropdown(withDOI(), NDExFileType.NETWORK)
      expect(buttonFor('Request DOI')).toBeDisabled()
    })
  })

  describe('a network without a DOI', () => {
    it('keeps every action available', () => {
      renderDropdown(networkItem, NDExFileType.NETWORK)

      expect(buttonFor('Set as Read-only')).toBeEnabled()
      expect(buttonFor('Edit Properties')).toBeEnabled()
      expect(buttonFor('Move to Trash')).toBeEnabled()
      expect(buttonFor('Request DOI')).toBeEnabled()
    })

    // Read-only by choice is still undoable — only a DOI freezes the flag.
    it('can still have a self-imposed read-only flag removed', () => {
      renderDropdown({ ...networkItem, isReadOnly: true }, NDExFileType.NETWORK)
      expect(buttonFor('Remove Read-only')).toBeEnabled()
    })
  })
})
