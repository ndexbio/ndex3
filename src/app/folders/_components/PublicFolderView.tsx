'use client'

import React from 'react'
import Link from 'next/link'
import { Folder, Network, Link2, ChevronRight } from 'lucide-react'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { usePublicFolderContents, useFolder } from '@/hooks/use-folder'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'

interface PublicFolderViewProps {
  uuid: string
  accessKey?: string
}

/**
 * PublicFolderView
 *
 * Read-only view of a public folder's contents. Rendered for anonymous users and
 * for authenticated users who do NOT own the folder. Contents are fetched with a
 * tokenless client (see usePublicFolderContents) so the backend serves the
 * folder's public listing rather than scoping it to the current user.
 */
export default function PublicFolderView({ uuid, accessKey }: PublicFolderViewProps) {
  const config = useConfig()
  const { folder, isLoading: isFolderLoading, error: folderError } = useFolder(uuid, accessKey)
  const {
    items,
    isLoading: isContentsLoading,
    error: contentsError,
    isEmpty,
  } = usePublicFolderContents(uuid, accessKey)

  const isLoading = isFolderLoading || isContentsLoading
  const error = folderError || contentsError

  const isAuthDenied = (err: unknown): boolean => {
    const e = err as { statusCode?: number; name?: string } | null | undefined
    return (
      e?.statusCode === 401 ||
      e?.statusCode === 403 ||
      e?.name === 'NDExAuthError'
    )
  }

  const authDenied = isAuthDenied(error)

  const resolveHref = (item: FileItemBase): string | null => {
    switch (item.type) {
      case NDExFileType.NETWORK:
        return `https://${config.ndexBaseUrl}/viewer/networks/${item.uuid}`
      case NDExFileType.FOLDER:
        return `/folders/${item.uuid}`
      case NDExFileType.SHORTCUT: {
        // Shortcuts point at another object via their attributes.
        const target = item.attributes?.target as string | undefined
        const targetType = item.attributes?.target_type as NDExFileType | undefined
        if (!target) return null
        if (targetType === NDExFileType.FOLDER) return `/folders/${target}`
        return `https://${config.ndexBaseUrl}/viewer/networks/${target}`
      }
      default:
        return null
    }
  }

  const iconFor = (type: FileItemBase['type']) => {
    switch (type) {
      case NDExFileType.FOLDER:
        return <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
      case NDExFileType.SHORTCUT:
        return <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
      default:
        return <Network className="h-5 w-5 text-muted-foreground shrink-0" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {folder?.name || 'Public Folder'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Read-only view. <span className="font-medium">Sign in</span> for full folder
          management features.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full rounded-md bg-primary/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">
            {authDenied ? 'This folder is private' : 'Folder unavailable'}
          </h2>
          <p className="text-muted-foreground">
            {authDenied
              ? "You don't have access to this folder. Sign in with an account that has permission to view it."
              : 'This folder could not be loaded. It may not exist.'}
          </p>
        </div>
      )}

      {!isLoading && !error && isEmpty && (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">This folder is empty</h2>
          <p className="text-muted-foreground">
            There are no publicly visible items in this folder.
          </p>
        </div>
      )}

      {!isLoading && !error && !isEmpty && (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => {
            const href = resolveHref(item)
            const row = (
              <div className="flex items-center gap-3 px-4 py-3">
                {iconFor(item.type)}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {item.name || item.uuid}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.type}
                    {item.type === NDExFileType.NETWORK &&
                      item.edges !== undefined &&
                      ` · ${item.edges} edges`}
                  </div>
                </div>
                {href && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            )

            if (!href) {
              return (
                <li key={item.uuid} className="opacity-70">
                  {row}
                </li>
              )
            }

            const isInternal = href.startsWith('/')
            return (
              <li key={item.uuid} className="hover:bg-muted/50 transition-colors">
                {isInternal ? (
                  <Link href={href} className="block">
                    {row}
                  </Link>
                ) : (
                  <a href={href} className="block">
                    {row}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}