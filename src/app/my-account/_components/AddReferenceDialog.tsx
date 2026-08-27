'use client'

import React, { useState, useEffect } from 'react'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { useToast } from '@/lib/contexts/ToastContext'
import RichTextEditor from '@/components/ui/rich-text-editor'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DialogShell from '@/components/shared/DialogShell'

interface AddReferenceDialogProps {
  isOpen: boolean
  onClose: () => void
  networkId: string
  onSuccess?: () => void
}

/**
 * Strips markup and whitespace to decide whether the editor really holds text.
 *
 * The rich text editor emits `<p></p>` for an empty document, so a plain
 * `trim()` on its HTML would call an empty reference non-empty and earn a 400
 * from the server, which rejects a blank `reference` field.
 */
export const hasReferenceText = (html: string): boolean =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim() !== ''

/**
 * Adds the publication reference to a pre-certified network.
 *
 * A user who ticked "Let me add/modify the reference later." when requesting a
 * DOI leaves the network pre-certified: locked from ordinary edits but with one
 * remaining chance to supply the reference. Submitting here spends that chance
 * — the server certifies the network, makes it PUBLIC, indexes it, and blocks
 * all further modification — so the action is confirmed before it is sent.
 */
const AddReferenceDialog: React.FC<AddReferenceDialogProps> = ({
  isOpen,
  onClose,
  networkId,
  onSuccess,
}) => {
  const [reference, setReference] = useState('')
  const [networkName, setNetworkName] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const { getNetworkSummary, updateNetworkReference } = useNetworkOperation()
  const { addToast } = useToast()

  // Seed the editor with any reference already on the network, so a user who
  // entered one during the DOI request edits it rather than retyping it.
  useEffect(() => {
    if (!isOpen || !networkId) return

    let cancelled = false

    const loadNetworkData = async () => {
      setIsLoadingData(true)
      setLoadError(null)
      try {
        const summary = await getNetworkSummary(networkId)
        if (cancelled) return
        setNetworkName(summary?.name || '')

        // The file listing that gates the menu item does not reliably carry
        // `isCertified`, so re-check against the summary, which always does.
        // Without this a stale row could offer the action on a network the
        // server would only reject.
        if (summary?.isCertified) {
          setLoadError(
            'This network has already been certified. Its reference can no longer be changed.'
          )
          return
        }

        setReference(summary?.properties?.reference?.v || '')
      } catch (error: any) {
        if (cancelled) return
        console.error('Failed to load network for Add Reference:', error)
        setLoadError(
          error?.message || 'Failed to load this network. Please close the dialog and try again.'
        )
      } finally {
        if (!cancelled) setIsLoadingData(false)
      }
    }

    loadNetworkData()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, networkId])

  const handleConfirm = async () => {
    try {
      await updateNetworkReference(networkId, reference)

      addToast({
        title: 'Reference Added',
        description: networkName
          ? `"${networkName}" is now certified and publicly visible.`
          : 'The network is now certified and publicly visible.',
        type: 'success',
        duration: 7000,
      })

      setIsConfirming(false)
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Failed to add reference:', error)

      // The server distinguishes "already certified" from "no DOI request",
      // and both arrive as 403. Surface its message so the user can tell which.
      const serverMessage =
        error?.response?.data?.message || error?.data?.message || error?.message

      addToast({
        title: 'Unable to Add Reference',
        description: serverMessage || 'Failed to add the reference. Please try again.',
        type: 'error',
        duration: 7000,
      })

      setIsConfirming(false)
    }
  }

  const canSubmit = !isLoadingData && !loadError && hasReferenceText(reference)

  return (
    <>
      <DialogShell
        isOpen={isOpen}
        onClose={onClose}
        title="Add Reference"
        subtitle="Add the publication reference for this network to complete its DOI request."
        isLoading={isLoadingData}
        loadingLines={2}
        confirmLabel="ADD REFERENCE"
        canConfirm={canSubmit}
        onConfirm={() => setIsConfirming(true)}
      >
        {loadError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        ) : (
          <>
            <label
              htmlFor="reference-editor"
              className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100"
            >
              Reference
            </label>
            <div id="reference-editor">
              <RichTextEditor
                content={reference}
                onChange={setReference}
                placeholder="e.g. Pratt D, et al. NDEx, the Network Data Exchange. Cell Syst. 2015;1(4):302-305."
              />
            </div>

            <div className="mt-6 rounded border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                This cannot be undone.
              </p>
              <p className="text-sm text-amber-900 dark:text-amber-200 mt-1">
                Adding the reference certifies this network. It will be made publicly visible,
                indexed for search, and permanently locked — no further changes will be
                possible.
              </p>
            </div>
          </>
        )}
      </DialogShell>

      <ConfirmDialog
        isOpen={isConfirming}
        title="Certify this network?"
        message={
          <>
            Adding this reference will make{' '}
            <strong>{networkName || 'this network'}</strong> public, index it for search, and
            permanently lock it. No further changes will be possible.
          </>
        }
        confirmLabel="Add Reference"
        busyLabel="Adding..."
        danger
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  )
}

export default AddReferenceDialog
