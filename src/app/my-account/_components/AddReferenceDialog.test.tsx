import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AddReferenceDialog, { hasReferenceText } from './AddReferenceDialog'

const mockGetNetworkSummary = jest.fn()
const mockUpdateNetworkReference = jest.fn()
const mockAddToast = jest.fn()

jest.mock('@/hooks/use-network-operation', () => ({
  useNetworkOperation: () => ({
    getNetworkSummary: mockGetNetworkSummary,
    updateNetworkReference: mockUpdateNetworkReference,
  }),
}))
jest.mock('@/lib/contexts/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}))

// The real editor is a tiptap instance; a textarea keeps the test about the
// dialog's behaviour rather than the editor's internals.
jest.mock('@/components/ui/rich-text-editor', () => ({
  __esModule: true,
  default: ({
    content,
    onChange,
  }: {
    content: string
    onChange: (html: string) => void
  }) => (
    <textarea
      aria-label="Reference editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

const NETWORK_ID = 'network-1'

const renderDialog = (props: Partial<React.ComponentProps<typeof AddReferenceDialog>> = {}) =>
  render(
    <AddReferenceDialog
      isOpen
      onClose={jest.fn()}
      networkId={NETWORK_ID}
      {...props}
    />,
  )

const editor = () => screen.getByLabelText('Reference editor') as HTMLTextAreaElement
const addReferenceButton = () =>
  screen.getByText('ADD REFERENCE').closest('button') as HTMLButtonElement
const confirmButton = () =>
  screen.getByRole('button', { name: 'Add Reference' }) as HTMLButtonElement

beforeEach(() => {
  jest.clearAllMocks()
  mockGetNetworkSummary.mockResolvedValue({
    name: 'My Network',
    properties: {},
  })
  mockUpdateNetworkReference.mockResolvedValue(undefined)
})

describe('hasReferenceText', () => {
  // The editor emits markup even when the user has typed nothing, and the
  // server rejects a blank reference with a 400.
  it.each([
    ['an empty document', '<p></p>', false],
    ['whitespace only', '<p>   </p>', false],
    ['a non-breaking space', '<p>&nbsp;</p>', false],
    ['an empty string', '', false],
    ['real text', '<p>Pratt D, et al.</p>', true],
    ['text inside markup', '<p><strong>NDEx</strong></p>', true],
  ])('%s → %s', (_label, html, expected) => {
    expect(hasReferenceText(html)).toBe(expected)
  })
})

describe('AddReferenceDialog', () => {
  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false })
    expect(screen.queryByText('Add Reference')).not.toBeInTheDocument()
  })

  it('seeds the editor with the reference already on the network', async () => {
    mockGetNetworkSummary.mockResolvedValue({
      name: 'My Network',
      properties: { reference: { t: 'string', v: '<p>Existing reference</p>' } },
    })

    renderDialog()

    await waitFor(() => expect(editor()).toHaveValue('<p>Existing reference</p>'))
  })

  it('blocks submission until the editor holds real text', async () => {
    renderDialog()
    await waitFor(() => expect(editor()).toBeInTheDocument())

    expect(addReferenceButton()).toBeDisabled()

    fireEvent.change(editor(), { target: { value: '<p></p>' } })
    expect(addReferenceButton()).toBeDisabled()

    fireEvent.change(editor(), { target: { value: '<p>Pratt D, et al.</p>' } })
    expect(addReferenceButton()).toBeEnabled()
  })

  it('does not call the server until the certification is confirmed', async () => {
    renderDialog()
    await waitFor(() => expect(editor()).toBeInTheDocument())
    fireEvent.change(editor(), { target: { value: '<p>Pratt D, et al.</p>' } })

    fireEvent.click(addReferenceButton())

    // The confirm step is now on screen, but nothing has been sent yet.
    expect(screen.getByText('Certify this network?')).toBeInTheDocument()
    expect(mockUpdateNetworkReference).not.toHaveBeenCalled()
  })

  it('sends the reference and closes once confirmed', async () => {
    const onClose = jest.fn()
    const onSuccess = jest.fn()
    renderDialog({ onClose, onSuccess })
    await waitFor(() => expect(editor()).toBeInTheDocument())
    fireEvent.change(editor(), { target: { value: '<p>Pratt D, et al.</p>' } })

    fireEvent.click(addReferenceButton())
    fireEvent.click(confirmButton())

    await waitFor(() =>
      expect(mockUpdateNetworkReference).toHaveBeenCalledWith(
        NETWORK_ID,
        '<p>Pratt D, et al.</p>',
      ),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSuccess).toHaveBeenCalled()
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    )
  })

  it('cancelling the confirmation sends nothing and keeps the dialog open', async () => {
    const onClose = jest.fn()
    renderDialog({ onClose })
    await waitFor(() => expect(editor()).toBeInTheDocument())
    fireEvent.change(editor(), { target: { value: '<p>Pratt D, et al.</p>' } })

    fireEvent.click(addReferenceButton())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockUpdateNetworkReference).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(editor()).toBeInTheDocument()
  })

  // The server returns 403 with distinct messages for "already certified" and
  // "no DOI request"; the user needs to see which one they hit.
  it("surfaces the server's reason when it refuses", async () => {
    mockUpdateNetworkReference.mockRejectedValue({
      response: {
        status: 403,
        data: {
          message:
            'This network has already been certified, updating reference is not allowed.',
        },
      },
    })
    const onClose = jest.fn()
    renderDialog({ onClose })
    await waitFor(() => expect(editor()).toBeInTheDocument())
    fireEvent.change(editor(), { target: { value: '<p>Pratt D, et al.</p>' } })

    fireEvent.click(addReferenceButton())
    fireEvent.click(confirmButton())

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description:
            'This network has already been certified, updating reference is not allowed.',
        }),
      ),
    )
    // A failure must not look like success: the dialog stays put.
    expect(onClose).not.toHaveBeenCalled()
  })

  // The file listing that gates the menu item does not reliably carry
  // isCertified, so the dialog re-checks against the summary.
  it('refuses an already-certified network instead of offering the form', async () => {
    mockGetNetworkSummary.mockResolvedValue({
      name: 'My Network',
      isCertified: true,
      properties: {},
    })

    renderDialog()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('already been certified'),
    )
    expect(screen.queryByLabelText('Reference editor')).not.toBeInTheDocument()
    expect(addReferenceButton()).toBeDisabled()
    expect(mockUpdateNetworkReference).not.toHaveBeenCalled()
  })

  it('reports a load failure instead of offering a broken form', async () => {
    mockGetNetworkSummary.mockRejectedValue(new Error('Network not found'))

    renderDialog()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Network not found'))
    expect(screen.queryByLabelText('Reference editor')).not.toBeInTheDocument()
    expect(addReferenceButton()).toBeDisabled()
  })
})
