'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  /** Body text, or rich content when a plain string isn't enough. */
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Label shown on the confirm button while onConfirm is in flight. */
  busyLabel?: string
  /** Styles the confirm action as destructive (red). */
  danger?: boolean
  /**
   * Runs on confirm. If it returns a promise the dialog stays open and disables
   * both buttons until it settles, so the user can't double-submit. The dialog
   * closes itself afterwards either way — callers report the outcome (toast).
   */
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/**
 * Generic confirm/cancel modal.
 *
 * Deliberately unopinionated about *what* is being confirmed so destructive
 * actions across the app share one look and one set of interaction rules
 * (Escape cancels, Enter confirms, backdrop click cancels, focus starts on the
 * confirm button). Follows the plain-overlay pattern used by the other dialogs
 * in this codebase rather than pulling in a headless dialog dependency.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  busyLabel,
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Move focus onto the confirm button so the dialog is immediately keyboard
  // operable, and reset the busy state when reopened after a failed attempt.
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false)
      confirmRef.current?.focus()
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (isSubmitting) return
    try {
      setIsSubmitting(true)
      await onConfirm()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isSubmitting) return
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      handleCancel()
    }
    if (e.key === 'Enter') {
      e.stopPropagation()
      void handleConfirm()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={handleCancel}
        data-testid="confirm-dialog-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-lg shadow-xl w-[440px] max-w-full z-10"
      >
        <div className="px-6 py-5">
          <h2 className="text-xl font-normal mb-3">{title}</h2>

          <div className="text-sm text-gray-700 leading-relaxed">{message}</div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-1.5 text-sky-700 hover:bg-gray-50 text-sm disabled:opacity-50"
              disabled={isSubmitting}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={handleConfirm}
              className={`px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 ${
                danger ? 'text-red-600' : 'text-sky-700'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (busyLabel ?? confirmLabel) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
