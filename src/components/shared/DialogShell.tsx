'use client'

import React from 'react'

export interface DialogShellProps {
  isOpen: boolean
  /** Closes the dialog. Fires from CANCEL and from a backdrop click. */
  onClose: () => void
  title: string
  /** Optional line under the title explaining what the dialog does. */
  subtitle?: React.ReactNode
  /** Tailwind width class for the panel, e.g. `w-[800px]`. */
  widthClass?: string
  /** Shows a placeholder skeleton in place of the body. */
  isLoading?: boolean
  /** How many skeleton bars to show while loading. */
  loadingLines?: number
  confirmLabel: string
  /** Confirm-button label while `isBusy`. Defaults to `confirmLabel`. */
  busyLabel?: string
  isBusy?: boolean
  /** Enables the confirm button. Ignored while loading or busy. */
  canConfirm: boolean
  onConfirm: () => void
  cancelLabel?: string
  children?: React.ReactNode
}

/**
 * The form-dialog chrome shared by the DOI dialogs: backdrop, panel, title,
 * loading skeleton, and the CANCEL / confirm button pair.
 *
 * Extracted so the two halves of the DOI flow — requesting a DOI and adding the
 * reference that certifies the network — stay visually identical without the
 * markup being maintained twice. Body content is entirely the caller's.
 *
 * This is deliberately *not* a confirmation modal. For a yes/no on a
 * destructive action use `ConfirmDialog`, which owns focus handling and the
 * Escape/Enter keys.
 */
const DialogShell: React.FC<DialogShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  widthClass = 'w-[700px]',
  isLoading = false,
  loadingLines = 3,
  confirmLabel,
  busyLabel,
  isBusy = false,
  canConfirm,
  onConfirm,
  cancelLabel = 'CANCEL',
  children,
}) => {
  if (!isOpen) return null

  const confirmEnabled = canConfirm && !isBusy && !isLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-gray-300 opacity-50" onClick={onClose}></div>

      {/* Dialog box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl ${widthClass} max-w-full z-10 max-h-[90vh] overflow-auto`}
      >
        <div className="px-6 py-5">
          {/* Header */}
          <h2
            className={`text-xl font-semibold ${
              subtitle ? 'mb-2' : 'mb-6'
            } text-gray-900 dark:text-gray-100`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{subtitle}</p>
          )}

          {isLoading ? (
            <div className="space-y-4" data-testid="dialog-shell-skeleton">
              {Array.from({ length: loadingLines }).map((_, i) => (
                <div
                  key={i}
                  className={`${
                    i % 2 === 1 ? 'h-32' : 'h-8'
                  } bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
                ></div>
              ))}
            </div>
          ) : (
            children
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sky-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded border border-gray-200 dark:border-gray-700"
              disabled={isBusy}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2 text-sm font-medium rounded transition-colors ${
                confirmEnabled
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!confirmEnabled}
            >
              {isBusy && busyLabel ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DialogShell
