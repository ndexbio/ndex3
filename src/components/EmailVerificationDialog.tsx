import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface EmailVerificationDialogProps {
  userName: string
  userEmail: string
  onVerify: () => void
  onCancel: () => void
}

/**
 * A dialog requiring the user to verify their email.
 * Shown when "emailUnverified" is true.
 */
export function EmailVerificationDialog({
  userName,
  userEmail,
  onVerify,
  onCancel,
}: EmailVerificationDialogProps) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Email Verification Required
            {userName ? ` for User: ${userName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Please check the email address{' '}
            <span className="font-semibold">
              {userEmail || 'associated with your username'}
            </span>{' '}
            to verify your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p>
            Once verified, click <strong>Already Verified</strong> to continue.
            Alternatively, click <strong>Log Out</strong> to browse NDEx as an
            anonymous user.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onVerify} className="mr-2">
            Already Verified
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Log Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
