/**
 * Client-side route classification for the hybrid static-export router.
 *
 * This app is a static export (`output: 'export'`), so dynamic UUID routes
 * cannot be pre-generated. The web server instead falls back to the root
 * `index.html` for any path it has no file or directory for, and the root page
 * component decides what to render by inspecting the URL itself.
 *
 * That makes "which route is this?" a pure string question, which is why it
 * lives here rather than inline in the page component: the fall-through case —
 * a path that matches nothing and should render a not-found view — is the one
 * behaviour most worth testing, and it is invisible when the matching is
 * tangled up with rendering.
 *
 * Note that `public/serve.json` lists the same route prefixes for the static
 * server used by the Playwright suite. Adding a dynamic route means editing
 * both.
 */

/** Route families the root client router can render. */
export type ClientRouteKind = 'home' | 'folder' | 'user' | 'networkset' | 'unknown'

export interface ClientRoute {
  kind: ClientRouteKind
  /** Present for 'folder', 'user' and 'networkset'. */
  uuid?: string
}

/**
 * UUID used by `generateStaticParams` to prerender a stub for each dynamic
 * route. It is never a real resource, so it falls back to the home page rather
 * than being treated as a missing folder or user.
 */
const PLACEHOLDER_UUID = 'placeholder'

// Every pattern tolerates an optional trailing slash: the app sets
// `trailingSlash: true`, so a deep link served through the static fallback
// arrives as /folders/{uuid}/ rather than /folders/{uuid}.
const FOLDER_ROUTE = /^\/folders\/([^/]+?)\/?$/
const USER_ROUTE = /^\/users\/([^/]+?)\/?$/
const NETWORKSET_ROUTE = /^\/networkset\/([^/]+?)\/?$/

/**
 * Removes the deployment's base path from a pathname so the route patterns,
 * which are written app-relative, still match on a subdirectory deployment.
 *
 * @param pathname - `window.location.pathname`, including any base path
 * @param basePath - `urlBaseName` from config, e.g. "/ndex3" (leading slash,
 *                   no trailing slash). Empty for a root deployment.
 * @returns The app-relative path, always beginning with "/"
 */
export const stripBasePath = (pathname: string, basePath?: string): string => {
  // A bare startsWith would also match a lookalike sibling: under basePath
  // "/ndex3", "/ndex30/missing" would be mangled into "0/missing". The path
  // must either be the base itself or sit beneath it.
  const isUnderBasePath =
    !!basePath &&
    (pathname === basePath || pathname.startsWith(`${basePath}/`))
  if (!isUnderBasePath) {
    return pathname
  }
  return pathname.slice(basePath.length) || '/'
}

/**
 * Classifies an app-relative path into the view the root router should render.
 *
 * @param path - App-relative path (run {@link stripBasePath} over it first)
 * @returns The matching route, or `{ kind: 'unknown' }` when nothing matches —
 *          which is a 404, not the home page
 */
export const classifyClientRoute = (path: string): ClientRoute => {
  if (path === '/' || path === '') {
    return { kind: 'home' }
  }

  const folderMatch = path.match(FOLDER_ROUTE)
  if (folderMatch) {
    const uuid = folderMatch[1]
    return uuid === PLACEHOLDER_UUID ? { kind: 'home' } : { kind: 'folder', uuid }
  }

  const userMatch = path.match(USER_ROUTE)
  if (userMatch) {
    const uuid = userMatch[1]
    return uuid === PLACEHOLDER_UUID ? { kind: 'home' } : { kind: 'user', uuid }
  }

  // Legacy NDEx2 pathname form; the caller canonicalizes it to /folders/{uuid}.
  // See docs/legacy-redirects.md.
  const networksetMatch = path.match(NETWORKSET_ROUTE)
  if (networksetMatch) {
    return { kind: 'networkset', uuid: networksetMatch[1] }
  }

  return { kind: 'unknown' }
}
