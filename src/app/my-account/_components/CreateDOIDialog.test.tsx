import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import CreateDOIDialog from './CreateDOIDialog'

/**
 * Coverage for the parts of the DOI request that must not regress: the shared
 * dialog chrome, and the checkbox → `isCertified` inversion that decides
 * whether the network is locked immediately or left pre-certified so a
 * reference can be added later.
 */

const mockGetNetworkSummary = jest.fn()
const mockUpdateNetworkSummary = jest.fn()
const mockCreateNetworkDOI = jest.fn()
const mockSetNetworkReadOnlyQuietly = jest.fn()
const mockAddToast = jest.fn()

jest.mock('@/hooks/use-network-operation', () => ({
  useNetworkOperation: () => ({
    getNetworkSummary: mockGetNetworkSummary,
    updateNetworkSummary: mockUpdateNetworkSummary,
    createNetworkDOI: mockCreateNetworkDOI,
    setNetworkReadOnlyQuietly: mockSetNetworkReadOnlyQuietly,
  }),
}))
jest.mock('@/lib/contexts/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))
jest.mock('@/components/ui/rich-text-editor', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <div>{content}</div>,
}))

const NETWORK_ID = 'network-1'

const renderDialog = (props: Partial<React.ComponentProps<typeof CreateDOIDialog>> = {}) =>
  render(
    <CreateDOIDialog isOpen onClose={jest.fn()} networkId={NETWORK_ID} {...props} />,
  )

const submitButton = () =>
  screen.getByText('SAVE AND REQUEST DOI').closest('button') as HTMLButtonElement

const laterCheckbox = () =>
  screen.getByLabelText(/add\/modify the reference later/i) as HTMLInputElement

beforeEach(() => {
  jest.clearAllMocks()
  mockGetNetworkSummary.mockResolvedValue({
    name: 'My Network',
    description: 'A description',
    properties: {
      version: { t: 'string', v: '1.0' },
      author: { t: 'string', v: 'Alice' },
      rights: { t: 'string', v: 'CC BY 4.0' },
      rightsHolder: { t: 'string', v: 'The Regents' },
    },
  })
  mockCreateNetworkDOI.mockResolvedValue(undefined)
  mockSetNetworkReadOnlyQuietly.mockResolvedValue(undefined)
  mockUpdateNetworkSummary.mockResolvedValue(undefined)
})

describe('CreateDOIDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false })
    expect(screen.queryByText('Request DOI')).not.toBeInTheDocument()
  })

  it('renders the dialog chrome and the loaded network once open', async () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Request DOI' })).toBeInTheDocument()
    // The body is a skeleton until the network summary arrives.
    expect(screen.getByTestId('dialog-shell-skeleton')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByDisplayValue('My Network')).toBeInTheDocument())
    expect(screen.queryByTestId('dialog-shell-skeleton')).not.toBeInTheDocument()
    expect(submitButton()).toBeInTheDocument()
  })

  it('blocks submission until the required fields are filled', async () => {
    mockGetNetworkSummary.mockResolvedValue({ name: '', description: '', properties: {} })

    renderDialog()

    await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
    expect(submitButton()).toBeDisabled()
    expect(mockCreateNetworkDOI).not.toHaveBeenCalled()
  })

  const fillContactEmail = () => {
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'alice@example.com' },
    })
  }

  /** Fills the form and advances to the confirmation step. */
  const advanceToConfirm = async () => {
    await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
    fillContactEmail()
    fireEvent.click(submitButton())
  }

  describe('confirmation before the request is filed', () => {
    it('does not contact the server until the user confirms', async () => {
      renderDialog()
      await advanceToConfirm()

      expect(screen.getByText('Publish and lock this network?')).toBeInTheDocument()
      expect(mockCreateNetworkDOI).not.toHaveBeenCalled()
      expect(mockUpdateNetworkSummary).not.toHaveBeenCalled()
    })

    it('warns that certifying is permanent and public', async () => {
      renderDialog()
      await advanceToConfirm()

      const dialog = screen.getByRole('dialog', { name: 'Publish and lock this network?' })
      expect(dialog).toHaveTextContent('publicly visible')
      expect(dialog).toHaveTextContent('permanently')
    })

    // The two outcomes are different enough that one message cannot serve both.
    it('describes the pre-certified outcome differently', async () => {
      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
      fillContactEmail()
      fireEvent.click(laterCheckbox())
      fireEvent.click(submitButton())

      const dialog = screen.getByRole('dialog', { name: 'Request a DOI?' })
      expect(dialog).toHaveTextContent('keeping its current visibility')
      expect(dialog).toHaveTextContent('one')
      expect(screen.queryByText('Publish and lock this network?')).not.toBeInTheDocument()
    })

    it('backing out sends nothing and keeps the form open', async () => {
      renderDialog()
      await advanceToConfirm()

      fireEvent.click(screen.getByRole('button', { name: 'Go Back' }))

      expect(mockCreateNetworkDOI).not.toHaveBeenCalled()
      expect(submitButton()).toBeInTheDocument()
    })
  })

  describe('the "add the reference later" checkbox inverts isCertified', () => {
    it('unchecked → isCertified true: the network is locked immediately', async () => {
      renderDialog()
      await advanceToConfirm()
      fireEvent.click(screen.getByRole('button', { name: 'Publish and Lock' }))

      await waitFor(() =>
        expect(mockCreateNetworkDOI).toHaveBeenCalledWith(
          NETWORK_ID,
          'alice@example.com',
          true,
        ),
      )
    })

    it('checked → isCertified false: the network is left pre-certified', async () => {
      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
      fillContactEmail()
      fireEvent.click(laterCheckbox())
      fireEvent.click(submitButton())
      fireEvent.click(screen.getByRole('button', { name: 'Request DOI' }))

      await waitFor(() =>
        expect(mockCreateNetworkDOI).toHaveBeenCalledWith(
          NETWORK_ID,
          'alice@example.com',
          false,
        ),
      )
    })
  })

  describe('rights holder is required', () => {
    // The submit button is disabled before validateForm can run, so the marker
    // beside the label is the only thing telling the user why. Every other
    // required field carries one.
    it('is marked with the required indicator', async () => {
      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())

      const label = screen.getByText('Rights Holder').closest('label')
      expect(label).toHaveTextContent('*')
    })

    it('marks every field that gates submission', async () => {
      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())

      for (const field of [
        'Title',
        'Version',
        'Description',
        'Authors',
        'Contact Email',
        'Rights',
        'Rights Holder',
      ]) {
        expect(screen.getByText(field).closest('label')).toHaveTextContent('*')
      }
    })

    it('blocks submission when it is empty', async () => {
      mockGetNetworkSummary.mockResolvedValue({
        name: 'My Network',
        description: 'A description',
        properties: {
          version: { t: 'string', v: '1.0' },
          author: { t: 'string', v: 'Alice' },
          rights: { t: 'string', v: 'CC BY 4.0' },
        },
      })

      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
      fillContactEmail()

      expect(submitButton()).toBeDisabled()
      fireEvent.click(submitButton())
      expect(screen.queryByText('Publish and lock this network?')).not.toBeInTheDocument()
    })
  })

  describe('a read-only network', () => {
    const readOnlySummaryWithEdit = async () => {
      mockGetNetworkSummary.mockResolvedValue({
        name: 'My Network',
        description: 'A description',
        isReadOnly: true,
        properties: {
          version: { t: 'string', v: '1.0' },
          author: { t: 'string', v: 'Alice' },
          rights: { t: 'string', v: 'CC BY 4.0' },
          rightsHolder: { t: 'string', v: 'The Regents' },
        },
      })
      renderDialog()
      await waitFor(() => expect(laterCheckbox()).toBeInTheDocument())
      // Touch a tracked field so there is metadata to save.
      fireEvent.change(screen.getByDisplayValue('My Network'), {
        target: { value: 'A renamed network' },
      })
      fillContactEmail()
      fireEvent.click(submitButton())
      fireEvent.click(screen.getByRole('button', { name: 'Publish and Lock' }))
    }

    // The server refuses metadata updates on a read-only network, so the flow
    // has to unlock it before saving.
    it('is made writable before its metadata is saved', async () => {
      await readOnlySummaryWithEdit()

      await waitFor(() =>
        expect(mockSetNetworkReadOnlyQuietly).toHaveBeenCalledWith(NETWORK_ID, false),
      )
      await waitFor(() => expect(mockUpdateNetworkSummary).toHaveBeenCalled())
      await waitFor(() => expect(mockCreateNetworkDOI).toHaveBeenCalled())
    })

    // A failed attempt must not leave a network editable that the user locked.
    it('has its read-only flag restored if the request fails', async () => {
      mockCreateNetworkDOI.mockRejectedValueOnce(new Error('server said no'))

      await readOnlySummaryWithEdit()

      await waitFor(() =>
        expect(mockSetNetworkReadOnlyQuietly).toHaveBeenCalledWith(NETWORK_ID, true),
      )
    })

    it('is left alone when there is no metadata to save', async () => {
      mockGetNetworkSummary.mockResolvedValue({
        name: 'My Network',
        description: 'A description',
        isReadOnly: true,
        properties: {
          version: { t: 'string', v: '1.0' },
          author: { t: 'string', v: 'Alice' },
          rights: { t: 'string', v: 'CC BY 4.0' },
          rightsHolder: { t: 'string', v: 'The Regents' },
        },
      })

      renderDialog()
      await advanceToConfirm()
      fireEvent.click(screen.getByRole('button', { name: 'Publish and Lock' }))

      await waitFor(() => expect(mockCreateNetworkDOI).toHaveBeenCalled())
      expect(mockSetNetworkReadOnlyQuietly).not.toHaveBeenCalled()
    })
  })
})
