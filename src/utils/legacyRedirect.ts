const FRAGMENT_ROUTE_MAP: ReadonlyArray<{ from: string; to: string }> = [
  { from: '/network/', to: '/viewer/networks/' },
  { from: '/networkset/', to: '/folders/' },
];

const LEGACY_HOST = 'public.ndexbio.org';
const CANONICAL_HOST = 'www.ndexbio.org';

/**
 * Given a full URL (typically window.location.href), returns the URL a legacy
 * hash-router / DOI link should redirect to, or null if it isn't a recognized
 * legacy link.
 *
 * Legacy links use client-side hash routing (`#/network/{id}`), so the fragment
 * never reaches the server — this must run in the browser.
 */
export function resolveLegacyRedirect(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

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

  const host = url.host === LEGACY_HOST ? CANONICAL_HOST : url.host;
  // Force https for the production ndex host (issue rule 3); leave localhost alone.
  const isProdHost = host === CANONICAL_HOST || host === LEGACY_HOST;
  const protocol = isProdHost ? 'https:' : url.protocol;

  return `${protocol}//${host}${match.to}${rest}`;
}