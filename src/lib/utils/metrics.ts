/**
 * Best-effort client-side metrics tracking.
 *
 * The app is a static export with no backend of its own, so there is nowhere to
 * record a client-side event except the web server's own access log. Pointing
 * `metricsUrl` at a path the server answers with 204 and writes to a dedicated
 * log file turns an ordinary access log into an event stream — see
 * `docs/not-found-routing.md` for the Apache recipe.
 *
 * Everything here is fire-and-forget. No caller may depend on delivery or on the
 * response: {@link sendMetricsEvent} returns `void` precisely so that nothing
 * can await it.
 */

import { withBasePath } from './path-utils'

/** Prefix on every console message from this module, so it can be grepped. */
const LOG_PREFIX = '[ndex3:metrics]'

/**
 * Endpoint used when `metricsUrl` is not present in `public/config.json`.
 *
 * A default rather than "off" because the path is a convention this app owns:
 * a deployment that has followed the Apache recipe works without restating it
 * in config. To turn tracking off, set `metricsUrl` to an empty string — that
 * is an explicit choice, distinguishable from the key simply being absent.
 */
export const DEFAULT_METRICS_URL = '/metrics'

/**
 * Event names this app emits. Adding an event is a code change only — the
 * server matches the whole `metricsUrl` subtree, not individual events.
 */
export type MetricsEvent = 'not-found'

/**
 * Builds the absolute URL for a metrics event.
 *
 * @param metricsUrl - `metricsUrl` from config. An app-relative path is
 *                     prefixed with `basePath`; a fully qualified URL is used
 *                     as-is. When absent, {@link DEFAULT_METRICS_URL} applies.
 * @param event - Event name, appended as a path segment
 * @param params - Query parameters describing the event
 * @param basePath - `urlBaseName` from config, for app-relative values
 * @returns The URL to request, or `null` when `metricsUrl` is explicitly blank,
 *          which is how a deployment turns tracking off
 */
export const buildMetricsEventUrl = (
  metricsUrl: string | undefined,
  event: MetricsEvent,
  params: Record<string, string> = {},
  basePath?: string,
): string | null => {
  // Absent (or null, since config.json is not type-checked) means "not
  // configured" and takes the default; blank means "deliberately off".
  const base = (metricsUrl ?? DEFAULT_METRICS_URL).trim()
  if (!base) {
    return null
  }

  const withoutTrailingSlash = base.replace(/\/$/, '')
  const resolved = withoutTrailingSlash.startsWith('http')
    ? withoutTrailingSlash
    : withBasePath(withoutTrailingSlash, basePath)

  const query = new URLSearchParams(params).toString()
  return query ? `${resolved}/${event}?${query}` : `${resolved}/${event}`
}

/**
 * Sends a metrics event. Never throws, never reports to the user, and never
 * affects what renders.
 *
 * Failures are warned to the console exactly once per call — `console.warn`,
 * not `console.error`, because a dropped tracking request is not an application failure
 * and does not belong in error reporting. Both failure shapes are covered: a
 * network, CORS or ad-blocked request rejects, while an HTTP 404 or 500 —
 * the likelier symptom of a server misconfiguration — resolves with
 * `ok: false`.
 *
 * Note that a *misrouted* tracking request cannot be detected here. If the server has no
 * rule for `metricsUrl`, the request falls through the SPA fallback and returns
 * 200 with `index.html`, which is indistinguishable from success without
 * coupling this module to a response contract. The server's log, not the
 * browser console, is the source of truth for whether the sink is wired up.
 *
 * @param metricsUrl - `metricsUrl` from config; when absent the default
 *                     endpoint is used, when blank nothing is sent
 * @param event - Event name
 * @param params - Query parameters describing the event
 * @param basePath - `urlBaseName` from config, for app-relative values
 */
export const sendMetricsEvent = (
  metricsUrl: string | undefined,
  event: MetricsEvent,
  params: Record<string, string> = {},
  basePath?: string,
): void => {
  const url = buildMetricsEventUrl(metricsUrl, event, params, basePath)
  if (!url) {
    return
  }

  // keepalive so the request still goes out if the user navigates away
  // immediately; no-store so an intermediary cache cannot swallow repeats.
  void fetch(url, { method: 'GET', keepalive: true, cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        console.warn(
          `${LOG_PREFIX} ${event} tracking request rejected by the server (HTTP ${response.status}): ${url}`,
        )
      }
    })
    .catch((error) => {
      // Routine causes: no such host, CORS, or an ad blocker dropping a URL
      // with "metrics" in the path. Expected, not a defect.
      console.warn(`${LOG_PREFIX} ${event} tracking request could not be sent: ${url}`, error)
    })
}
