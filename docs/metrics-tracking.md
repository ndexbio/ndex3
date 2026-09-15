---
status: current
last-verified: 2026-09-14
---

# Metrics Tracking Wire Format

The contract between the app and whoever operates the server that receives
these requests. If you are writing a log parser, adding an event, or wiring up
the endpoint, this is the normative description — everything else about the
first event is in [not-found-routing.md](./not-found-routing.md).

Implemented by `src/lib/utils/metrics.ts`; `src/lib/utils/metrics.test.ts` is
the executable version of everything below.

## Request shape

```
GET <metricsUrl>/<event>[?<params>]
```

`metricsUrl` comes from `public/config.json` and **defaults to `/metrics`** when
the key is absent, so a deployment that has followed the Apache recipe needs no
config change.

Absent and blank mean different things:

| `metricsUrl` | Result |
| --- | --- |
| absent (or `null`) | `/metrics` — the default; not a decision, so the convention applies |
| `""` or whitespace | **no request at all** — an explicit decision to turn tracking off |
| any value | used as given |

Nothing else in the app changes either way: the not-found view renders
identically whether or not a request is sent.

- An **app-relative** `metricsUrl` (`/metrics`) is prefixed with `urlBaseName`,
  so a subdirectory deployment sends `/ndex3/metrics/...`.
- A **fully qualified** `metricsUrl` (`https://metrics.example.org/e`) is used
  verbatim, and `urlBaseName` is ignored. Note that a cross-origin target must
  send CORS headers or every request fails — see "Failure" below.
- A trailing slash on `metricsUrl` is trimmed, so `/metrics` and `/metrics/`
  behave identically.
- When an event has no parameters, no `?` is emitted.

The request is `GET` with `keepalive: true` (so it survives the user navigating
away) and `cache: 'no-store'`. **The response body is never read.** The server
should answer `204 No Content`; any 2xx is treated as success.

`GET` rather than the `navigator.sendBeacon` API, which would POST: a GET with query
parameters is what appears readably in an access log, which is the entire point
of the mechanism.

## Events

The event name is a single path segment appended to `metricsUrl`. It is a typed
union — `MetricsEvent` in `src/lib/utils/metrics.ts` — so the complete
vocabulary is always visible in one place.

| Event | Emitted when | Parameters |
| --- | --- | --- |
| `not-found` | The browser requests a URL matching no route | `url` — the app-relative path that was requested |

That is the whole vocabulary today.

### `url` (for `not-found`)

Precisely what it contains, because a log parser depends on it:

- The **pathname only**. The query string is deliberately never forwarded:
  shared links carry `?accesskey=<secret>`, and a malformed shared link is
  exactly the kind of URL that lands here. Forwarding it would write a live
  access key into a long-retained server log.
- **`urlBaseName` stripped**, so `/ndex3/nope/` is reported as `/nope/`. The
  value is what the app sees, not what the server saw.
- The **trailing slash is preserved** as requested (`trailingSlash: true` means
  most real traffic carries one).

## Encoding

Parameters are encoded with `URLSearchParams`, which is *not* the same as
`encodeURIComponent`. The difference bites log parsers:

- `/` becomes `%2F`, `?` becomes `%3F`
- **a space becomes `+`, not `%20`**

So a request for `/a b/c?d` is reported as:

```
/metrics/not-found?url=%2Fa+b%2Fc%3Fd
```

Decode with something that understands form encoding (Python's
`urllib.parse.parse_qs`, PHP's `parse_str`, JS's `URLSearchParams`) rather than
a plain percent-decoder, or spaces will come back as literal `+`.

## Failure

Nothing in the UI depends on delivery. The sender returns `void` so no caller
can await it, and a failure is warned once to the console with the prefix
`[ndex3:metrics]` — `console.warn`, never `console.error`.

Two failure shapes are both handled: a network, CORS or ad-blocked request
*rejects*, while an HTTP error status *resolves* with `ok: false`. A third is
undetectable by design — if the server has no rule for `metricsUrl`, the request
falls through the SPA catch-all and returns 200 with the app's own HTML, which
is indistinguishable from success without coupling the client to a response
contract. See "Reading the metrics log honestly" in
[not-found-routing.md](./not-found-routing.md).

## Server side

Apache configuration for the endpoint and its log file lives in
[APACHE_STATIC_DEPLOYMENT.md](./APACHE_STATIC_DEPLOYMENT.md) — "The metrics
endpoint and its log". It is the only place Apache config is documented.

## Adding an event

1. Add the name to the `MetricsEvent` union in `src/lib/utils/metrics.ts`.
2. Call `sendMetricsEvent` with it, and add a row to the table above.
3. **No server change is required.** The Apache recipe in
   [APACHE_STATIC_DEPLOYMENT.md](./APACHE_STATIC_DEPLOYMENT.md) matches the
   whole `metricsUrl` subtree, not individual event names, precisely so that a
   new event is a code change only.

Before adding a parameter, check it against the `url` rule above: anything
derived from a URL the user supplied may contain a credential, and this endpoint
writes to a file that is kept.
