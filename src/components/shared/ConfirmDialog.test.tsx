import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

const baseProps = {
  isOpen: true,
  title: 'Move folder to trash?',
  message: '"My Folder" and any contents will be moved to the trash.',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

const buttonFor = (name: string) => screen.getByRole('button', { name })

describe('ConfirmDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing until it is opened', () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<ConfirmDialog {...baseProps} isOpen />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the title and message it was given', () => {
    render(<ConfirmDialog {...baseProps} />)

    expect(screen.getByText('Move folder to trash?')).toBeVisible()
    expect(
      screen.getByText(
        '"My Folder" and any contents will be moved to the trash.',
      ),
    ).toBeVisible()
  })

  it('confirms on the OK button and cancels on the Cancel button', () => {
    render(<ConfirmDialog {...baseProps} />)

    fireEvent.click(buttonFor('Cancel'))
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1)
    expect(baseProps.onConfirm).not.toHaveBeenCalled()

    fireEvent.click(buttonFor('OK'))
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1)
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the backdrop is clicked', () => {
    render(<ConfirmDialog {...baseProps} />)

    fireEvent.click(screen.getByTestId('confirm-dialog-backdrop'))

    expect(baseProps.onCancel).toHaveBeenCalledTimes(1)
    expect(baseProps.onConfirm).not.toHaveBeenCalled()
  })

  it('cancels on Escape and confirms on Enter', () => {
    render(<ConfirmDialog {...baseProps} />)
    const dialog = screen.getByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1)
    expect(baseProps.onConfirm).not.toHaveBeenCalled()

    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1)
  })

  it('opens with focus on the confirm button so it is keyboard operable', () => {
    render(<ConfirmDialog {...baseProps} />)

    expect(buttonFor('OK')).toHaveFocus()
  })

  it('shows the busy label and blocks a second confirm while one is in flight', async () => {
    let release: () => void = () => {}
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    render(
      <ConfirmDialog
        {...baseProps}
        busyLabel="Moving..."
        onConfirm={onConfirm}
      />,
    )

    fireEvent.click(buttonFor('OK'))

    const busyButton = await screen.findByRole('button', { name: 'Moving...' })
    expect(busyButton).toBeDisabled()
    expect(buttonFor('Cancel')).toBeDisabled()

    // A second click while busy must not fire the action again.
    fireEvent.click(busyButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    release()
    await waitFor(() => expect(buttonFor('OK')).toBeEnabled())
  })

  it('styles the confirm action as destructive only when asked', () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} />)
    expect(buttonFor('OK')).not.toHaveClass('text-red-600')

    rerender(<ConfirmDialog {...baseProps} danger />)
    expect(buttonFor('OK')).toHaveClass('text-red-600')
  })
})
