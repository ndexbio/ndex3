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
 * The only response the endpoint may answer with. Anything else — including a
 * 200 — means the request was not handled by the metrics rule: the likeliest
 * cause is that it fell through to the SPA fallback and came back as the app's
 * own HTML. One success code is what makes that detectable.
 */
export const METRICS_SUCCESS_STATUS = 204

/**
 * Event names this app emits. Adding an event is a code change only — the
 * server matches the whole `metricsUrl` subtree, not individual events.
 */
export type MetricsEvent = 'not-found'

/**
 * Set once a cross-origin `metricsUrl` has been reported, so a misconfigured
 * deployment warns a single time rather than on every event.
 */
let warnedAboutOrigin = false

/**
 * True when `url` resolves to the origin the app is served from.
 *
 * Deliberately an origin comparison rather than a check for an absolute URL:
 * `https://www.ndexbio.org/metrics` served from that host is same-origin and
 * valid. Relative URLs resolve against the current origin and always pass.
 *
 * @param url - Absolute or app-relative URL
 * @returns `false` only for a genuine origin mismatch (or an unparseable URL)
 */
const isSameOrigin = (url: string): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * Builds the absolute URL for a metrics event.
 *
 * @param metricsUrl - `metricsUrl` from config. An app-relative path is
 *                     prefixed with `basePath`; a fully qualified URL is used
 *                     as-is, and must point at the app's own origin (enforced
 *                     by {@link sendMetricsEvent}). When absent,
 *                     {@link DEFAULT_METRICS_URL} applies.
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
 * Two requirements make the outcome deterministic, and both are enforced here:
 *
 *  - **The endpoint must be same-origin.** A cross-origin response cannot be
 *    read by the browser, so the status below could never be checked. A
 *    cross-origin `metricsUrl` is a configuration error, reported once and not
 *    sent. Note this is an origin comparison, not a "looks absolute" test: a
 *    fully qualified URL pointing at the app's own origin is perfectly valid.
 *  - **The endpoint must answer {@link METRICS_SUCCESS_STATUS}.** Anything else
 *    means the request was not handled by the server's metrics rule.
 *
 * Together these close what used to be a blind spot: a request falling through
 * to the SPA fallback returns 200 with the app's own HTML, which previously
 * counted as success.
 *
 * Failures are warned to the console — `console.warn`, not `console.error`,
 * because a dropped tracking request is not an application failure and does not
 * belong in error reporting. Two shapes are distinguished, since a rejected
 * request has no status at all: a network or ad-blocked request rejects, while
 * a response with the wrong status resolves.
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

  if (!isSameOrigin(url)) {
    // Once per page load: a misconfigured endpoint would otherwise warn on
    // every event, and the operator can only act on the message once anyway.
    if (!warnedAboutOrigin) {
      warnedAboutOrigin = true
      console.warn(
        `${LOG_PREFIX} invalid metricsUrl: must be same-origin as the app, ` +
          `so its response can be read. Not sending: ${url}`,
      )
    }
    return
  }

  // keepalive so the request still goes out if the user navigates away
  // immediately; no-store so an intermediary cache cannot swallow repeats;
  // no-referrer because the page URL can carry ?accesskey=<secret> and the
  // Referer header would otherwise write it into the server's access log —
  // the very thing stripping the query string from `params` prevents.
  void fetch(url, {
    method: 'GET',
    keepalive: true,
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  })
    .then((response) => {
      if (response.status !== METRICS_SUCCESS_STATUS) {
        console.warn(
          `${LOG_PREFIX} ${event}: unexpected metrics response ` +
            `(HTTP ${response.status}, expected ${METRICS_SUCCESS_STATUS}) — ` +
            `check the server's metrics rewrite rule: ${url}`,
        )
      }
    })
    .catch((error) => {
      // Routine causes: no such host, or an ad blocker dropping a URL with
      // "metrics" in the path. Expected, not a defect.
      console.warn(
        `${LOG_PREFIX} ${event} tracking request could not be sent: ${url}`,
        error,
      )
    })
}
