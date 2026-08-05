import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShareDialog from './ShareDialog'
import { updateVisibility, updateBulkVisibility } from '@/lib/api/sharing'
import { Visibility, NDExFileType } from '@js4cytoscape/ndex-client'

// --- Mocks -----------------------------------------------------------------

jest.mock('@/lib/api/sharing', () => ({
  updateVisibility: jest.fn(),
  updateBulkVisibility: jest.fn(),
  updateMemberPermissions: jest.fn(),
  removeMemberPermissions: jest.fn(),
  transferOwnership: jest.fn(),
}))

jest.mock('@/lib/api/ndex-client-manager', () => ({
  getNdexClient: jest.fn(() => ({
    user: {
      searchUsers: jest.fn().mockResolvedValue([]),
    },
  })),
}))

jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: () => ({ ndexBaseUrl: 'https://test.ndexbio.org' }),
}))

jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { externalId: 'current-user-uuid', userName: 'testuser' },
  }),
}))

jest.mock('@/hooks/use-file-permissions', () => ({
  useFilePermissions: () => ({
    userPermissions: new Map(),
    userUuids: [],
    isLoading: false,
    error: null,
    hasData: true,
  }),
}))

jest.mock('@/hooks/use-user-details', () => ({
  useUserDetails: () => ({
    userDetails: new Map(),
    isLoadingUsers: false,
    userError: null,
  }),
}))

// Child components have their own API/data dependencies; stub them out so
// this suite only exercises ShareDialog's own behavior.
jest.mock('./AccessLinkSection', () => ({
  __esModule: true,
  default: () => <div data-testid="access-link-section" />,
}))

jest.mock('./PeopleWithAccessSection', () => ({
  __esModule: true,
  default: () => <div data-testid="people-with-access-section" />,
}))

// --- Fixtures ----------------------------------------------------------------

const mockUpdateVisibility = updateVisibility as jest.Mock
const mockUpdateBulkVisibility = updateBulkVisibility as jest.Mock

const singleNetworkItem = {
  uuid: 'network-uuid-1',
  name: 'Test Network',
  type: NDExFileType.NETWORK,
  visibility: Visibility.PRIVATE,
}

const bulkItems = [
  {
    uuid: 'network-uuid-1',
    name: 'Network One',
    type: NDExFileType.NETWORK,
    visibility: Visibility.PRIVATE,
  },
  {
    uuid: 'network-uuid-2',
    name: 'Network Two',
    type: NDExFileType.NETWORK,
    visibility: Visibility.PUBLIC,
  },
]

const renderDialog = (overrides: Record<string, any> = {}) => {
  const onClose = jest.fn()
  const onSuccess = jest.fn()
  const props = {
    isOpen: true,
    onClose,
    onSuccess,
    items: [singleNetworkItem],
    mode: 'single' as const,
    ...overrides,
  }
  const utils = render(<ShareDialog {...props} />)
  return { ...utils, onClose, onSuccess }
}

// --- Tests -------------------------------------------------------------------

describe('ShareDialog deferred visibility save', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateVisibility.mockResolvedValue(undefined)
    mockUpdateBulkVisibility.mockResolvedValue(undefined)
  })

  describe('radio button selection', () => {
    it('does NOT call the API when a visibility radio button is clicked', () => {
      renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(mockUpdateBulkVisibility).not.toHaveBeenCalled()
    })

    it('does NOT call the API even after clicking through multiple options', () => {
      renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))
      fireEvent.click(screen.getByLabelText('Unlisted'))
      fireEvent.click(screen.getByLabelText('Private'))
      fireEvent.click(screen.getByLabelText('Public'))

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(mockUpdateBulkVisibility).not.toHaveBeenCalled()
    })

    it('updates the checked radio locally for immediate UI feedback', () => {
      renderDialog()

      expect(screen.getByLabelText('Private')).toBeChecked()

      fireEvent.click(screen.getByLabelText('Public'))

      expect(screen.getByLabelText('Public')).toBeChecked()
      expect(screen.getByLabelText('Private')).not.toBeChecked()
    })

    it('shows a pending-change hint when the selection differs from the original', () => {
      renderDialog()

      expect(
        screen.queryByText(/will be applied when you click Done/i)
      ).not.toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Public'))

      expect(
        screen.getByText(/will be applied when you click Done/i)
      ).toBeInTheDocument()

      // Reverting to the original selection removes the hint
      fireEvent.click(screen.getByLabelText('Private'))

      expect(
        screen.queryByText(/will be applied when you click Done/i)
      ).not.toBeInTheDocument()
    })
  })

  describe('Done button', () => {
    it('commits the pending visibility change exactly once when Done is clicked', async () => {
      const { onClose, onSuccess } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

      expect(mockUpdateVisibility).toHaveBeenCalledTimes(1)
      expect(mockUpdateVisibility).toHaveBeenCalledWith(
        expect.anything(), // ndex client
        singleNetworkItem.uuid,
        singleNetworkItem.type,
        Visibility.PUBLIC
      )
      expect(mockUpdateBulkVisibility).not.toHaveBeenCalled()

      expect(onSuccess).toHaveBeenCalledWith([
        { uuid: singleNetworkItem.uuid, visibility: Visibility.PUBLIC },
      ])
    })

    it('commits only the FINAL selection when the user clicks through several options', async () => {
      const { onClose } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))
      fireEvent.click(screen.getByLabelText('Unlisted'))
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

      expect(mockUpdateVisibility).toHaveBeenCalledTimes(1)
      expect(mockUpdateVisibility).toHaveBeenCalledWith(
        expect.anything(),
        singleNetworkItem.uuid,
        singleNetworkItem.type,
        Visibility.UNLISTED
      )
    })

    it('makes no API call and reports no updates when Done is clicked without changes', async () => {
      const { onClose, onSuccess } = renderDialog()

      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(mockUpdateBulkVisibility).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('makes no API call when the user re-selects the original visibility', async () => {
      const { onClose } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))
      fireEvent.click(screen.getByLabelText('Private')) // back to original
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
    })

    it('uses the bulk endpoint for multiple items and reports every uuid', async () => {
      const { onClose, onSuccess } = renderDialog({ items: bulkItems, mode: 'bulk' })

      fireEvent.click(screen.getByLabelText('Unlisted'))
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

      expect(mockUpdateBulkVisibility).toHaveBeenCalledTimes(1)
      expect(mockUpdateBulkVisibility).toHaveBeenCalledWith(
        expect.anything(),
        bulkItems,
        Visibility.UNLISTED
      )
      expect(mockUpdateVisibility).not.toHaveBeenCalled()

      expect(onSuccess).toHaveBeenCalledWith([
        { uuid: 'network-uuid-1', visibility: Visibility.UNLISTED },
        { uuid: 'network-uuid-2', visibility: Visibility.UNLISTED },
      ])
    })

    it('keeps the dialog open and shows an error when the save fails', async () => {
      mockUpdateVisibility.mockRejectedValueOnce(new Error('server exploded'))
      const { onClose, onSuccess } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() =>
        expect(screen.getByText('Failed to update visibility')).toBeInTheDocument()
      )

      expect(onClose).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()

      // Retry succeeds: dialog closes and change is reported
      fireEvent.click(screen.getByRole('button', { name: /done/i }))

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
      expect(mockUpdateVisibility).toHaveBeenCalledTimes(2)
      expect(onSuccess).toHaveBeenCalledWith([
        { uuid: singleNetworkItem.uuid, visibility: Visibility.PUBLIC },
      ])
    })
  })

  describe('closing without confirming discards the pending change', () => {
    it('X button: no API call, no visibility update reported', () => {
      const { onClose, onSuccess, container } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))

      // The X close button is the first button in the header
      const header = container.querySelector('.border-b') as HTMLElement
      const closeButton = header.querySelector('button') as HTMLElement
      fireEvent.click(closeButton)

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(mockUpdateBulkVisibility).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape key: no API call, no visibility update reported', () => {
      const { onClose, onSuccess } = renderDialog()

      fireEvent.click(screen.getByLabelText('Unlisted'))
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('backdrop click: no API call, no visibility update reported', () => {
      const { onClose, onSuccess, container } = renderDialog()

      fireEvent.click(screen.getByLabelText('Public'))

      const backdrop = container.querySelector('.fixed.inset-0.bg-gray-300') as HTMLElement
      fireEvent.click(backdrop)

      expect(mockUpdateVisibility).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})