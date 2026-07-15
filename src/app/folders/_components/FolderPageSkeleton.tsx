import React from 'react'

interface FolderPageSkeletonProps {
  /** Show a header title/subtitle skeleton above the row skeletons. */
  showHeader?: boolean
}

/**
 * FolderPageSkeleton
 *
 * Single shared loading placeholder used by both `FolderViewer` (while it's
 * still resolving auth/ownership, before it knows whether to render
 * `MyAccount` or `PublicFolderView`) and `PublicFolderView` (while it's
 * fetching folder metadata/contents).
 *
 * Using the exact same markup in both places means the handoff between them
 * is visually a no-op - there's one continuous loading state instead of two
 * differently-shaped skeletons swapping in and out, which is what reads as a
 * "flash" to the user.
 */
export default function FolderPageSkeleton({ showHeader = true }: FolderPageSkeletonProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {showHeader && (
        <div className="mb-6">
          <div className="h-9 w-64 rounded-md bg-primary/10 animate-pulse mb-2" />
          <div className="h-4 w-96 rounded-md bg-primary/10 animate-pulse" />
        </div>
      )}
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
