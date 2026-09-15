import { PageNotFound } from '@/components/ui/ErrorPages/PageNotFound'

/**
 * Next's own not-found boundary.
 *
 * In production this is largely inert: the web server rewrites every path it
 * has no file for to the root document, so unknown URLs are resolved by the
 * client router in `page.tsx` and this route is never reached. It earns its
 * place in two other situations — `npm run dev`, where file-system routing
 * handles unknown paths and `page.tsx` never runs, and any deployment that
 * wires the exported `404.html` up as an `ErrorDocument`.
 *
 * It cannot report the requested path (there is no `window` here and the export
 * is prerendered), so it renders the same view without one.
 *
 * Note a development-only quirk: a legacy `/networkset/{uuid}` URL has no
 * file-system route, so in `npm run dev` it lands here instead of being
 * redirected to `/folders/{uuid}`. That redirect is a production concern only —
 * see docs/legacy-redirects.md.
 */
export default function NotFound() {
  return <PageNotFound />
}
