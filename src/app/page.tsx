'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/contexts/ConfigContext'
import Home from '@/app/_components/Home'
import FolderViewer from '@/app/folders/_components/FolderViewer'
import UserPublicPage from '@/app/users/_components/UserPublicPage'

/**
 * Root Page with Static Export Compatibility
 *
 * Handles client-side routing for dynamic routes that can't be pre-generated
 * in static export mode. In development, file-system routing works normally.
 * In production (static export), we need client-side detection for dynamic UUIDs.
 */
export default function HomePage() {
  const router = useRouter()
  const basePath = useBasePath()
  const [path, setPath] = useState<string | null>(null)

  useEffect(() => {
    // Decide the route from window.location.pathname, not Next's usePathname().
    // A deep link like /folders/{uuid}/ is served the "/" route's index.html via
    // the static rewrite, so usePathname() is seeded from the hydrated route
    // ("/") and can reconcile to the real URL a render later. Any render where
    // it still reads "/" falls through to <Home /> — the reported home-page
    // flash before the folder view appears. window.location.pathname is the
    // true URL on the first client render, so the folder branch is taken
    // immediately and Home is never an intermediate. Reading window only inside
    // the effect keeps hydration safe (the server has no window). Strip basePath
    // so the route regexes (which expect a leading "/folders/…") still match on
    // subdirectory deployments (e.g. urlBaseName "/ndex3").
    let p = window.location.pathname
    if (basePath && p.startsWith(basePath)) {
      p = p.slice(basePath.length) || '/'
    }
    // Canonicalize legacy /networkset/{uuid} → /folders/{uuid} here so routing
    // works off the target path and doesn't depend on router.replace triggering
    // a re-render (path is a one-time snapshot; this effect won't re-run on
    // navigation). The folder branch below then renders the view immediately,
    // while router.replace updates the URL to the canonical /folders form.
    const networksetMatch = p.match(/^\/networkset\/([^/]+?)\/?$/)
    if (networksetMatch) {
      p = `/folders/${networksetMatch[1]}`
      console.log('Redirecting legacy networkset route to folders:', networksetMatch[1])
      router.replace(p)
    }
    setPath(p)
  }, [basePath, router])

  // Don't render until the real client-side path is known
  if (path === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  // Handle folder routes that couldn't be statically generated.
  // The optional trailing slash matters: this app sets trailingSlash: true, so
  // a deep link served through the static rewrite arrives as /folders/{uuid}/.
  const folderMatch = path.match(/^\/folders\/([^\/]+?)\/?$/)
  if (folderMatch) {
    const uuid = folderMatch[1]
    // Skip if it's the placeholder (should use file-system routing)
    if (uuid !== 'placeholder') {
      // FolderViewer parses ?accesskey= itself, so shared-link READ access
      // works identically through this path and the file-system route.
      console.log('Client-side folder route for UUID:', uuid)
      return <FolderViewer uuid={uuid} />
    }
  }

  // Handle user profile routes that couldn't be statically generated
  const userMatch = path.match(/^\/users\/([^\/]+?)\/?$/)
  if (userMatch) {
    const uuid = userMatch[1]
    // Skip if it's the placeholder (should use file-system routing)
    if (uuid !== 'placeholder') {
      console.log('Client-side user route for UUID:', uuid)
      return <UserPublicPage uuid={uuid} />
    }
  }

  // Default home page
  return <Home />
}
