import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import DialogShell from './DialogShell'

const renderShell = (props: Partial<React.ComponentProps<typeof DialogShell>> = {}) =>
  render(
    <DialogShell
      isOpen
      onClose={jest.fn()}
      title="Request DOI"
      confirmLabel="SAVE"
      canConfirm
      onConfirm={jest.fn()}
      {...props}
    >
      <p>form body</p>
    </DialogShell>,
  )

const confirm = () => screen.getByText('SAVE').closest('button') as HTMLButtonElement
const cancel = () => screen.getByText('CANCEL').closest('button') as HTMLButtonElement

describe('DialogShell', () => {
  it('renders nothing when closed', () => {
    renderShell({ isOpen: false })
    expect(screen.queryByText('Request DOI')).not.toBeInTheDocument()
  })

  it('renders the title and body when open', () => {
    renderShell()
    expect(screen.getByRole('dialog', { name: 'Request DOI' })).toBeInTheDocument()
    expect(screen.getByText('form body')).toBeInTheDocument()
  })

  it('shows a subtitle when given one', () => {
    renderShell({ subtitle: 'Add the publication reference.' })
    expect(screen.getByText('Add the publication reference.')).toBeInTheDocument()
  })

  it('replaces the body with a skeleton while loading', () => {
    renderShell({ isLoading: true })
    expect(screen.queryByText('form body')).not.toBeInTheDocument()
    expect(screen.getByTestId('dialog-shell-skeleton')).toBeInTheDocument()
  })

  describe('the confirm button', () => {
    it('is enabled when the caller says the form is valid', () => {
      renderShell()
      expect(confirm()).toBeEnabled()
    })

    it('is disabled when the caller says the form is invalid', () => {
      const onConfirm = jest.fn()
      renderShell({ canConfirm: false, onConfirm })

      expect(confirm()).toBeDisabled()
      fireEvent.click(confirm())
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('is disabled while loading, even when the form is valid', () => {
      renderShell({ isLoading: true })
      expect(confirm()).toBeDisabled()
    })

    it('is disabled while busy, and shows the busy label', () => {
      renderShell({ isBusy: true, busyLabel: 'SUBMITTING...' })

      const button = screen.getByText('SUBMITTING...').closest('button') as HTMLButtonElement
      expect(button).toBeDisabled()
      expect(screen.queryByText('SAVE')).not.toBeInTheDocument()
    })

    it('keeps the confirm label when busy without a busy label', () => {
      renderShell({ isBusy: true })
      expect(confirm()).toBeDisabled()
    })

    it('calls onConfirm when clicked', () => {
      const onConfirm = jest.fn()
      renderShell({ onConfirm })

      fireEvent.click(confirm())
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('closing', () => {
    it('closes from the cancel button', () => {
      const onClose = jest.fn()
      renderShell({ onClose })

      fireEvent.click(cancel())
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    // Guards against a click landing mid-submit and abandoning work in flight.
    it('disables cancel while busy', () => {
      const onClose = jest.fn()
      renderShell({ onClose, isBusy: true })

      expect(cancel()).toBeDisabled()
      fireEvent.click(cancel())
      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
