'use client'

import React from 'react'
import Link from 'next/link'

// Renders the owner name in a list row. Links to the user's profile (by
// ownerUUID) when the item belongs to someone other than the current user;
// falls back to plain text (or "Me") otherwise. Click/dblclick propagation
// is stopped so navigating to the profile doesn't select the row or trigger
// the row's double-click handler (which opens the network / navigates into
// the folder).
//
// Falls back to plain text when ownerUUID is missing, so older records
// without that field don't render broken links.
export const OwnerCell = ({
  owner,
  ownerUUID,
  currentUserName,
  readOnly,
}: {
  owner?: string | null
  ownerUUID?: string | null
  currentUserName: string | null
  readOnly?: boolean
}) => {
  if (!owner) {
    return (
      <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
        <span className="truncate">{readOnly ? '' : 'Me'}</span>
      </div>
    )
  }

  const isCurrentUser = !!currentUserName && owner === currentUserName

  // Plain text when it's the current user, or when we don't have a UUID to link to
  if (isCurrentUser || !ownerUUID) {
    return (
      <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
        <span className="truncate">{owner}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-start w-full text-sm">
      <Link
        href={`/users/${ownerUUID}`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        title={`View ${owner}'s profile`}
        data-testid="owner-link"
        className="truncate text-muted-foreground hover:text-foreground hover:underline transition-colors"
      >
        {owner}
      </Link>
    </div>
  )
}