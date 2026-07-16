'use client'

import React from 'react'

export type FolderErrorVariant = 'forbidden' | 'notFound' | 'generic'

interface FolderErrorStateProps {
  variant: FolderErrorVariant
  /** Changes the forbidden copy: anonymous viewers get a sign-in prompt. */
  isAuthenticated?: boolean
  /** Shown as a "Sign in" button for anonymous forbidden states. */
  onSignIn?: () => void
  /** Extra detail for the generic variant. */
  message?: string
}

/**
 * FolderErrorState
 *
 * Friendly full-width card for the expected folder-view error states:
 *  - forbidden (401/403): private resource the viewer has no permission on
 *  - notFound (404): the folder does not exist
 *  - generic: anything unexpected
 *
 * Shared so every surface that renders folder errors shows identical copy.
 */
export default function FolderErrorState({
  variant,
  isAuthenticated = false,
  onSignIn,
  message,
}: FolderErrorStateProps) {
  let title: string
  let description: string

  switch (variant) {
    case 'forbidden':
      title = "You don't have permission to view this folder"
      description = isAuthenticated
        ? "Your account doesn't have access to this folder. Ask the owner for access or an access link."
        : 'This folder is not public. Sign in if it was shared with your account.'
      break
    case 'notFound':
      title = "This folder doesn't exist"
      description = 'It may have been deleted, or the link may be incorrect.'
      break
    default:
      title = 'Error loading content'
      description = message || 'Something went wrong while loading this folder. Please try again later.'
  }

  return (
    <div
      className="bg-muted/50 rounded-lg p-8 text-center"
      data-testid={`folder-error-${variant}`}
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {variant === 'forbidden' && !isAuthenticated && onSignIn && (
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          onClick={onSignIn}
        >
          Sign in
        </button>
      )}
    </div>
  )
}
