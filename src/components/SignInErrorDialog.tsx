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

export interface SignInErrorDialogProps {
  errorMessage: string
  onDismiss: () => void
}

/**
 * Shown when NDEx sign-in fails for a reason other than email verification.
 * Blocks the app until the user dismisses, then the app resumes as anonymous.
 */
export function SignInErrorDialog({ errorMessage, onDismiss }: SignInErrorDialogProps) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign-In Failed</DialogTitle>
          <DialogDescription>
            Your account could not be signed in to NDEx.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground break-words">{errorMessage}</p>
        </div>

        <DialogFooter>
          <Button onClick={onDismiss}>Continue as Guest</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
