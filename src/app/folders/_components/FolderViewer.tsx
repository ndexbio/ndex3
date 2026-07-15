'use client'

import React from 'react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useFolder } from '@/hooks/use-folder'
import MyAccount from '@/app/my-account/_components/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'
import PublicFolderView from './PublicFolderView'

interface FolderViewerProps {
  uuid?: string
}

/**
 * FolderViewer Component
 *
 * Routes a folder URL to the right experience based on OWNERSHIP, not merely on
 * authentication:
 *  - Owner (authenticated, folder.owner === current user): full MyAccount
 *    management experience.
 *  - Everyone else (anonymous, or authenticated non-owner): read-only
 *    PublicFolderView.
 *
 * The key correctness point is that authentication alone must not switch the data
 * source. The public listing endpoint scopes results to the requesting user when a
 * token is present, so routing a non-owner through MyAccount produced an empty
 * folder. PublicFolderView fetches the public contents tokenless instead.
 */
export default function FolderViewer({ uuid }: FolderViewerProps) {
  const { isAuthenticated, user } = useAuth()

  const validUuid = uuid && uuid !== 'placeholder' ? uuid : null

  // Fetch folder metadata to determine ownership. useFolder builds an anonymous
  // cache key when not authenticated, so this works for public folders too.
  const { folder, isLoading } = useFolder(validUuid)

  // Handle placeholder UUID from static generation / missing uuid
  if (!validUuid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Folder Not Found</h1>
          <p className="text-muted-foreground">
            The requested folder could not be found or may not be publicly accessible.
          </p>
        </div>
      </div>
    )
  }

  // Same ownership check used by NetworksList / FoldersList.
  const currentUserName = user?.userName || null
  const userOwns =
    isAuthenticated &&
    !!currentUserName &&
    !!folder?.owner &&
    folder.owner === currentUserName

  // For authenticated users, wait for metadata before deciding, to avoid a flash
  // of the public view for an owner (who should land in MyAccount).
  if (isAuthenticated && isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full rounded-md bg-primary/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  // Owners get the full management experience.
  if (userOwns) {
    return <MyAccount tabState={MyAccountTabType.MYNETWORKS} uuid={validUuid} />
  }

  // Anonymous users and authenticated non-owners get the read-only public view.
  return <PublicFolderView uuid={validUuid} />
}