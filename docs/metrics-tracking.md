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
- A **fully qualified** `metricsUrl` (`https://www.ndexbio.org/metrics`) is used
  verbatim, and `urlBaseName` is ignored.
- A trailing slash on `metricsUrl` is trimmed, so `/metrics` and `/metrics/`
  behave identically.
- When an event has no parameters, no `?` is emitted.

The request is `GET` with `keepalive: true` (so it survives the user navigating
away), `cache: 'no-store'`, and `referrerPolicy: 'no-referrer'`. **The response
body is never read.**

### The endpoint must be same-origin

`metricsUrl` must resolve to the origin the app is served from. A cross-origin
response cannot be read by the browser, so the status rule below could never be
checked and every request would be indistinguishable from a failure.

A cross-origin `metricsUrl` is therefore treated as a **configuration error**:
the app reports it once to the console and sends nothing.

This is an origin comparison, not a ban on absolute URLs — a fully qualified
`metricsUrl` pointing at the app's own origin is valid and works normally.

### The endpoint must answer 204

`204 No Content` is the only response that counts as delivered. **Any other
status, including `200`, is reported to the console as unexpected.**

That is deliberate rather than strict for its own sake. The likeliest
misconfiguration is that the server has no rule for `metricsUrl` at all, in
which case the request falls through the SPA fallback and comes back as `200`
with the app's own HTML. With one success code, that is visible instead of
silent.

Because no automated test can confirm the server really emits 204, the warning
names the status it got, the status it wanted, and the rule to go and look at.

### No referrer is sent

The page URL can carry `?accesskey=<secret>` (see the `url` rule below), and the
`Referer` header would otherwise put it in the server's access log — the exact
thing stripping the query string from the event parameters prevents. The request
is sent with `referrerPolicy: 'no-referrer'` so that **access keys are not
propagated in metrics logs**.

Note the narrow scope of that claim: it is about this request only. It says
nothing about access keys reaching other logs by other routes.

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
can await it, and failures go to the console with the prefix `[ndex3:metrics]` —
`console.warn`, never `console.error`.

Delivery failures are reported **every time they happen**, because each one is a
separate event that may or may not recur. The single exception is a cross-origin
`metricsUrl`: that is a static configuration mistake with the same outcome on
every request, so it is reported once per page load and then suppressed.

### Is a request sent at all?

Two configurations are refused before anything leaves the browser, so "no
console output" and "no request" are not the same thing:

| `metricsUrl` | Request sent | Console |
| --- | --- | --- |
| absent — defaults to `/metrics` | yes | see the next table |
| app-relative, e.g. `/metrics` | yes | see the next table |
| fully qualified on the app's own origin | yes | see the next table |
| fully qualified cross-origin | **no** | `invalid metricsUrl`, once per page load |
| `""` or whitespace | **no** | nothing — tracking is off on purpose |

### What the console reports for a sent request

| Response | Console |
| --- | --- |
| `204` | nothing — delivered |
| Any other status, including `200` | `unexpected metrics response (HTTP n, expected 204)`, naming the rule to check — **every time** |
| Request rejects | `tracking request could not be sent` — a separate message, because no status exists — **every time** |

A request rejects for routine reasons — no such host, or an ad blocker dropping
a URL with `metrics` in the path. Those are expected, not defects.

What used to be a fourth, undetectable case — a request falling through to the
SPA fallback and returning `200` with the app's own HTML — is now the second row
above. See "Reading the metrics log honestly" in
[not-found-routing.md](./not-found-routing.md) for what the resulting log can
and cannot tell you.

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
