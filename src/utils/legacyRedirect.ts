const FRAGMENT_ROUTE_MAP: ReadonlyArray<{ from: string; to: string }> = [
  { from: '/network/', to: '/viewer/networks/' },
  { from: '/networkset/', to: '/folders/' },
];

const LEGACY_HOST = 'public.ndexbio.org';
const CANONICAL_HOST = 'www.ndexbio.org';

/**
 * Canonicalizes the origin for known NDEx production hosts: rewrites
 * public.ndexbio.org -> www.ndexbio.org and forces https for either. Runs
 * unconditionally, independent of path or hash. Returns the new origin
 * (e.g. "https://www.ndexbio.org"), or null if the origin is already correct.
 */
export function resolveHostRedirect(url: URL): string | null {
  const host = url.host === LEGACY_HOST ? CANONICAL_HOST : url.host;
  const isProdHost = host === CANONICAL_HOST || host === LEGACY_HOST;
  const protocol = isProdHost ? 'https:' : url.protocol;

  const origin = `${protocol}//${host}`;
  return origin !== url.origin ? origin : null;
}

/**
 * Rewrites a recognized legacy hash-router fragment (e.g. "#/network/{id}")
 * into the real path it should navigate to. Only reads `url.hash` — host and
 * pathname are irrelevant, so this fires the same way regardless of which
 * path the browser landed on (e.g. "/" or "/index.html").
 *
 * `/network/` targets the NDEx Network Viewer, a sibling app deployed on the
 * same host at `/viewer/networks/{id}` — not a route inside this Next.js app.
 * `/networkset/` targets `/folders/{id}`, which IS a route inside this app
 * (see the separate pathname-based redirect in src/app/page.tsx).
 *
 * Returns the new path (+ id and any query string carried across from the
 * fragment), or null if the hash isn't a recognized legacy pattern.
 */
export function resolveFragmentRedirect(url: URL): string | null {
  const hash = url.hash; // e.g. "#/network/{id}?accesskey=..."
  if (!hash.startsWith('#/')) {
    return null;
  }

  const fragment = hash.slice(1); // drop '#': "/network/{id}?accesskey=..."
  const match = FRAGMENT_ROUTE_MAP.find(({ from }) => fragment.startsWith(from));
  if (!match) {
    return null; // recognized hash pattern not present — leave the URL alone
  }

  // id + optional ?accesskey=... is carried across unchanged
  const rest = fragment.slice(match.from.length);
  return `${match.to}${rest}`;
}

/**
 * Given a full URL (typically window.location.href), returns the URL this
 * page should redirect to, or null if neither legacy rule applies.
 *
 * Composes two independent rules into a single target URL so a link like
 * "http://public.ndexbio.org/#/network/{id}" redirects in one hop instead of
 * two (host fix, then fragment fix):
 *  1. resolveHostRedirect — unconditional origin canonicalization.
 *  2. resolveFragmentRedirect — legacy hash-router fragment rewriting.
 */
export function resolveLegacyRedirect(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const newOrigin = resolveHostRedirect(url);
  const newPath = resolveFragmentRedirect(url);

  if (!newOrigin && !newPath) {
    return null;
  }

  const origin = newOrigin ?? url.origin;
  const pathAndQuery = newPath ?? `${url.pathname}${url.search}${url.hash}`;

  return `${origin}${pathAndQuery}`;
}
