'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import MyAccount from '@/app/my-account/_components/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'
import FolderErrorState from '@/components/shared/FolderErrorState'

interface FolderViewerProps {
  uuid?: string
}

/**
 * FolderViewer Component
 *
 * Thin pass-through for /folders/{uuid}. Every viewer — anonymous, signed-in
 * non-owner, owner — gets the same MyAccount page and the same API calls; the
 * server decides what the caller may see, and MyAccount adapts what it offers
 * (read-only vs management) based on ownership. See
 * docs/folder-viewing-feature.md for the full spec.
 *
 * The optional ?accesskey= URL parameter grants READ on the folder (and
 * cascades to its contents). It's parsed here — rather than in the two route
 * entry points (file-system route in dev, root client routing in the static
 * export) — so both paths honor it identically.
 */
export default function FolderViewer({ uuid }: FolderViewerProps) {
  const searchParams = useSearchParams()
  const accessKey = searchParams?.get('accesskey') ?? undefined

  // Handle placeholder UUID from static generation / missing uuid
  if (!uuid || uuid === 'placeholder') {
    return (
      <div className="container mx-auto px-4 py-8">
        <FolderErrorState variant="notFound" />
      </div>
    )
  }

  return (
    <MyAccount
      tabState={MyAccountTabType.MYNETWORKS}
      uuid={uuid}
      accessKey={accessKey}
    />
  )
}
