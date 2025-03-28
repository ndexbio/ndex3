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
            Your account must be verified before accessing certain features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p>
            Please check the email address
            <span className="font-semibold mx-1">
              {userEmail || 'associated with your username'}
            </span>
            to verify your account.
          </p>
          <p>
            Once verified, click <strong>Already Verified</strong> below.
            Otherwise, click <strong>Log Out</strong> to continue as an
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
