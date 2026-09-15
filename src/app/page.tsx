'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfig, useBasePath } from '@/lib/contexts/ConfigContext'
import { classifyClientRoute, stripBasePath } from '@/lib/utils/client-routes'
import { sendMetricsEvent } from '@/lib/utils/metrics'
import Home from '@/app/_components/Home'
import FolderViewer from '@/app/folders/_components/FolderViewer'
import UserPublicPage from '@/app/users/_components/UserPublicPage'
import { PageNotFound } from '@/components/ui/ErrorPages/PageNotFound'

/**
 * Root Page with Static Export Compatibility
 *
 * Handles client-side routing for dynamic routes that can't be pre-generated
 * in static export mode. In development, file-system routing works normally.
 * In production (static export), we need client-side detection for dynamic UUIDs.
 *
 * Anything this component cannot place is a 404: the web server has already
 * failed to find a file for the path and fallen back to this document, so there
 * is nobody left to ask. See docs/not-found-routing.md.
 */
export default function HomePage() {
  const router = useRouter()
  const config = useConfig()
  const basePath = useBasePath()
  // Deliberately a string, not the classified route object. `router` is not a
  // stable reference under every renderer, so this effect can re-run on each
  // render; storing a string lets React's identity check bail out of the
  // re-render. Storing a fresh object here instead spins forever.
  const [path, setPath] = useState<string | null>(null)
  // Path already reported to metrics. Guards both the effect re-running and
  // React's StrictMode double-invoke in development (Next defaults
  // reactStrictMode to true), either of which would double-count one visit.
  const reportedPath = useRef<string | null>(null)

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
    // so the route patterns (which expect a leading "/folders/…") still match on
    // subdirectory deployments (e.g. urlBaseName "/ndex3").
    const requested = stripBasePath(window.location.pathname, basePath)
    const route = classifyClientRoute(requested)

    // Canonicalize legacy /networkset/{uuid} → /folders/{uuid} here so routing
    // works off the target path and doesn't depend on router.replace triggering
    // a re-render. The folder branch below then renders the view immediately,
    // while router.replace updates the URL to the canonical /folders form.
    if (route.kind === 'networkset') {
      const target = `/folders/${route.uuid}`
      console.log('Redirecting legacy networkset route to folders:', route.uuid)
      router.replace(target)
      setPath(target)
      return
    }

    if (route.kind === 'unknown' && reportedPath.current !== requested) {
      // Set before the request so a repeat invocation is already excluded.
      reportedPath.current = requested
      console.warn('No route matches the requested path:', requested)
      // Pathname only. Shared links carry ?accesskey=<secret> in the query
      // string, and a malformed one lands here — forwarding the query would
      // write a live access key into the server's access log.
      sendMetricsEvent(config.metricsUrl, 'not-found', { url: requested }, basePath)
    }

    setPath(requested)
  }, [basePath, config.metricsUrl, router])

  // Don't render until the real client-side path is known
  if (path === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  // Classification is a pure function of the path, so it is derived during
  // render rather than held in state.
  const route = classifyClientRoute(path)

  // Folder and user routes that couldn't be statically generated.
  if (route.kind === 'folder') {
    // FolderViewer parses ?accesskey= itself, so shared-link READ access
    // works identically through this path and the file-system route.
    console.log('Client-side folder route for UUID:', route.uuid)
    return <FolderViewer uuid={route.uuid as string} />
  }

  if (route.kind === 'user') {
    console.log('Client-side user route for UUID:', route.uuid)
    return <UserPublicPage uuid={route.uuid as string} />
  }

  if (route.kind === 'unknown') {
    return <PageNotFound path={path} />
  }

  // Default home page
  return <Home />
}
