---
status: current
last-verified: 2026-09-14
---

# Not-Found Routing

Why an invalid URL shows a "Page Not Found" view instead of the home page, why
that view renders in place rather than redirecting, and how the server gets to
find out about it. For *what the code does*, read the TSDoc on the functions
named below; for *how it behaves*, read `src/lib/utils/client-routes.test.ts`,
`src/lib/utils/metrics.test.ts` and `test/playwright/not-found.spec.ts`.

## How a URL is actually resolved

The app is a static export served behind Apache, which tries the filesystem
first and only falls back to the root document for paths it has no file for.
Requests therefore split three ways:

| Class | Example | Resolution |
| --- | --- | --- |
| A real file or directory | `/search/`, `/about/`, `/docs/data-model/`, `/_next/…` | served straight from the export; the client router never runs |
| No filesystem match | `/folders/{uuid}/`, `/users/{uuid}/`, `/networkset/{uuid}/`, `/doesnotexist` | rewritten to the root document, which resolves the route in the browser |
| Outside the app's alias | `/rest/`, `/auth2`, `/cytoscape`, `/viewer/networks/…` | other vhost configuration; never reaches the app |

This is the ordinary SPA history-fallback, and it is the reason the server
cannot answer this question itself: a legitimate deep link and a typo are
indistinguishable to it. Both arrive in the second class, and only the browser
knows which route patterns exist. See
[APACHE_STATIC_DEPLOYMENT.md](./APACHE_STATIC_DEPLOYMENT.md).

## The view renders in place

`classifyClientRoute` in `src/lib/utils/client-routes.ts` sorts an app-relative
path into one of the route families the root page component can render, or
`unknown`. `unknown` renders `PageNotFound` — at the URL the visitor typed. It
does not redirect.

That is deliberate, and it is the idiomatic shape for a client-routed app: the
address bar is the most useful thing on screen for someone who mistyped a link,
and a redirect throws it away. It also means there is no second HTML document to
keep in sync, no reachability check before navigating, and no way to get into a
redirect loop.

> This departs from the literal wording of issue #48, which asked for a redirect
> to a configurable URL. The redirect was a means to an end — server-side
> visibility of bad URLs — and that end is met by the metrics tracking request below,
> without coupling what the visitor sees to what the operator measures.

Before extracting `classifyClientRoute`, the root page component matched three
route shapes inline and fell through to the home page for everything else. A
junk URL rendered a perfectly normal home page with a 200 status, which is the
bug the issue reported. The route patterns are also mirrored in
`public/serve.json` for the static server the Playwright suite uses, so **adding
a dynamic route means editing both**.

## Two things it is easy to get wrong

**The placeholder UUID is not a missing resource.** `generateStaticParams`
prerenders a `placeholder` stub for each dynamic route. `classifyClientRoute`
maps those to the home page rather than to `unknown`, because they are a build
artifact, not something a visitor asked for.

**Only the pathname is ever reported.** `withAccessKey` in
`src/lib/utils/access-key.ts` puts a live access key in the query string of
shared links, and a malformed shared link classifies as `unknown`. Forwarding
the query string to the metrics sink would write that key into a dedicated,
long-retained server log. The unit tests assert this directly so that nobody
"improves" it later by appending the search string.

## The metrics tracking request

`metricsUrl` in `public/config.json` is an optional base URL. When set,
`sendMetricsEvent` in `src/lib/utils/metrics.ts` appends an event segment and
query parameters and issues one fire-and-forget request — for this feature,
`<metricsUrl>/not-found?url=<the requested path>`.

It is named as a *base* so it scales: a future event is a new path segment, not
a new config key, and the server matches the whole subtree.

The exact request shape, the event vocabulary, what each parameter contains and
how it is encoded are specified in [metrics-tracking.md](./metrics-tracking.md) —
read that before writing anything that parses these log lines.

Nothing in the UI depends on it. The not-found view is already on screen before
the request settles, `sendMetricsEvent` returns nothing so no caller can await
it, and setting `metricsUrl` to an empty string stops any request being made. A
failure warns
once to the console — `console.warn`, never `console.error`, because a dropped
tracking request is not an application failure and does not belong in error reporting.
Both failure shapes are covered: a network, CORS or ad-blocked request rejects,
while an HTTP error status resolves with `ok: false`.

Google Analytics is already wired up behind `NEXT_PUBLIC_GA_ID` and would
capture the same event. It is off by default and blocked in practice; the server
log is the always-on, server-side record. They answer different questions.

## Reading the metrics log honestly

This is the part that will be misread six months from now, so:

- **A misrouted tracking request looks like a success.** If the server has no rule for
  `metricsUrl`, the request falls through the SPA fallback and comes back 200
  with the app's own HTML. Nothing warns, because detecting it would mean
  coupling the client to a response contract it should not know about. The
  server's log, not the browser console, is the proof the sink is wired up.
- **Ad blockers drop it.** Blocking URL paths containing `metrics` is routine.
  Those requests reject and warn, and the event is lost. Expected, not a defect.
- **Only full page loads are reported.** The request is sent from the root page
  component as it mounts, so a typed URL, an external link or a reload is
  counted. A client-side navigation *within* the app to a route that does not
  exist renders Next's own boundary instead and sends nothing. That is the
  intended trade: the log is for URLs arriving from outside, and a broken
  in-app link is a bug to fix in code, not a statistic to gather.
- **The counts are a lower bound, always.** Bots, crawlers and no-JS clients
  never send one, and the request only fires for paths that reach the app at
  all — anything the server resolves itself is invisible. The log answers *which
  bad URLs do real browsers hit*, not *how many 404s occurred*.

## The response is still HTTP 200

An unknown URL renders the not-found view with a 200 status, because the server
served the app shell. This is inherent to a static export with history fallback
and is what client-routed apps generally do.

The alternative would be to pin the server rewrite to the known dynamic prefixes
— exactly the list already in `public/serve.json` — and let everything else fall
into an `ErrorDocument`. That was considered and rejected: it moves the app's
route table into server configuration that has to be edited on every new dynamic
route, and it does not remove the need for the in-app view anyway, because
`/folders/not-a-uuid` is still rewritten to the app and can only be judged in
the browser.

## Development and test environments

In `npm run dev` the file-system router handles unknown paths, so the root page
component never runs and Next's own boundary, `src/app/not-found.tsx`, renders
the same view. It cannot show the requested path — there is no `window` when it
prerenders. In production that boundary is inert: the exported `404.html` is
never routed to behind the catch-all.

Worth knowing before opening that file and concluding it is broken: the
prerendered `404.html` contains the config provider's "Loading configuration..."
screen, not the not-found view. That is true of *every* page in this export —
the provider gates its children until `config.json` resolves, which cannot
happen at build time — and the real view appears as soon as the page hydrates.
`test/playwright/not-found.spec.ts` asserts that it does.

One development-only quirk follows from this: a legacy `/networkset/{uuid}` URL
has no file-system route, so in `npm run dev` it renders the not-found view
instead of redirecting to `/folders/{uuid}`. The redirect is a production
concern only — see [legacy-redirects.md](./legacy-redirects.md).

The Playwright suite serves the export with `serve`, which rewrites only the
prefixes listed in `public/serve.json`. A top-level junk path like
`/doesnotexist` would otherwise be answered by `serve` itself and never reach
the app, so that file carries two `doesnotexist` entries purely to mirror
Apache's catch-all for the tests. They are a test affordance and nothing else; a
blanket `**` rewrite is not an option, since it would also swallow genuine
missing-asset 404s under `/_next/`.
