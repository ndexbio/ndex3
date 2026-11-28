'use client'

import React from 'react'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { useToast } from '@/lib/contexts/ToastContext'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface CancelDOIDialogProps {
  isOpen: boolean
  onClose: () => void
  networkId: string
  networkName?: string
  onSuccess?: () => void
}

/**
 * Clears a DOI request that failed to mint.
 *
 * Minting runs inside the request that starts it, and a failure leaves the
 * network read-only with its DOI stuck at "Pending" instead of rolling back —
 * so the network is locked and will not accept another request. Cancelling is
 * the only way out, which makes this a recovery action rather than a
 * destructive one: it unlocks the network so the user can fix the problem and
 * try again.
 */
const CancelDOIDialog: React.FC<CancelDOIDialogProps> = ({
  isOpen,
  onClose,
  networkId,
  networkName,
  onSuccess,
}) => {
  const { cancelNetworkDOI } = useNetworkOperation()
  const { addToast } = useToast()
  const label = networkName ? `"${networkName}"` : 'this network'

  const handleConfirm = async () => {
    try {
      await cancelNetworkDOI(networkId)

      addToast({
        title: 'DOI Request Cancelled',
        description: `${networkName ? `"${networkName}"` : 'The network'} is editable again. You can request a DOI once the problem is fixed.`,
        type: 'success',
        duration: 7000,
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Failed to cancel DOI request:', error)

      // The server refuses anything that is not stuck at "Pending" — most
      // importantly a DOI that minted successfully, which is permanent.
      const serverMessage =
        error?.response?.data?.message || error?.data?.message || error?.message

      addToast({
        title: 'Unable to Cancel DOI Request',
        description: serverMessage || 'Failed to cancel the DOI request. Please try again.',
        type: 'error',
        duration: 7000,
      })

      onClose()
    }
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Cancel DOI request?"
      message={
        <>
          The DOI request for <strong>{label}</strong> could not be completed, which
          has left the network locked. Cancelling clears the failed request and makes
          the network editable again, so you can correct the problem and request a DOI
          once more.
          <br />
          <br />
          No DOI has been published, so nothing that has been cited is affected.
        </>
      }
      confirmLabel="Cancel Request"
      cancelLabel="Keep Request"
      busyLabel="Cancelling..."
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  )
}

export default CancelDOIDialog
