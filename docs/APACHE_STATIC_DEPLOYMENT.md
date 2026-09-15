# Apache Static Deployment Guide

## Overview

The app builds to a directory of static files (`output: 'export'`) with no
server runtime of its own. Apache serves that directory directly.

This guide describes the **real NDEx deployment**: the app is served from the
vhost's `DocumentRoot` at `/opt/ndex/ndex-webapp`, so it lives at the site root
and `urlBaseName` in `public/config.json` is empty. Every path below is
therefore root-relative. To serve the app under a subdirectory instead, set
`urlBaseName` and see "Subdirectory deployments" at the end.

This is the only place Apache configuration is documented; other docs link here
rather than repeating it.

## Build Process

```bash
npm run build
```

This creates an `out/` directory containing the complete site.

## Apache Configuration

Excerpt from the vhost, trimmed to what serves this app. Two blocks are marked
**(1)** and **(2)** — those are the metrics additions, explained in the next
section. Everything else is the existing static-file setup.

```apache
<VirtualHost *:443>
        ServerName dev3.ndex.ucsd.edu
        DocumentRoot "/opt/ndex/ndex-webapp"

        ErrorLog  /var/log/httpd/ndex_443_error_log
        CustomLog /var/log/httpd/ndex_443_access_log combined

        # Never cache the entry points. index.html references content-hashed
        # assets under _next/, so a stale copy pins a browser to an old build.
        <FilesMatch "\.(html|htm|js|css)$">
          FileETag None
          <IfModule mod_headers.c>
            Header unset ETag
            Header set Cache-Control "max-age=0, no-cache, no-store, must-revalidate"
            Header set Pragma "no-cache"
            Header set Expires "Wed, 12 Jan 1980 05:00:00 GMT"
          </IfModule>
        </FilesMatch>

        <Directory /opt/ndex/ndex-webapp>
                Options Indexes FollowSymLinks
                AllowOverride None
                Require all granted
                RewriteEngine on

                # (1) Metrics sink. No file exists at this path and none
                #     should: the rule ends the request with 204 No Content.
                #     It must come FIRST, or the fallback below answers the
                #     tracking request with index.html. Matching the whole subtree means
                #     a new event type needs no Apache change.
                RewriteRule ^metrics(/|$) - [R=204,L]

                # Serve real files and directories as-is...
                RewriteCond %{REQUEST_FILENAME} -f [OR]
                RewriteCond %{REQUEST_FILENAME} -d
                RewriteRule ^ - [L]

                # ...and hand everything else to the app's client router.
                RewriteRule ^ index.html [L]
        </Directory>

        # (2) Metrics tracking requests to their own log. SetEnvIf's Request_URI excludes
        #     the query string, so match on the path; %r below logs the full
        #     request line, query string included, which is where the event
        #     data lives. CustomLog is not valid inside <Directory>, hence
        #     vhost scope.
        SetEnvIf Request_URI "^/metrics(/|$)" ndex_metrics

        # No %{Referer}i: the referring page URL can carry ?accesskey=<secret>.
        # The client also sends these with referrerPolicy "no-referrer", so this
        # is belt and braces.
        LogFormat "%h %l %u %t \"%r\" %>s %b \"%{User-Agent}i\"" ndexmetrics
        CustomLog /var/log/httpd/ndex_443_metrics_log ndexmetrics env=ndex_metrics
</VirtualHost>
```

**Omitted from the excerpt**, because this app neither affects nor depends on
them: the TLS directives, the `*:80` vhost that redirects to HTTPS, the
`ProxyPass` rules for `/rest/`, `/v2/`, `/v3/`, `/auth2/`, `/integratedsearch/`
and `/edgefilter/`, and the `Alias`es for `/viewer`, `/iquery`, `/cytoscape` and
`/contentrootpath`.

Those last two groups matter for one reason worth knowing: Apache resolves
proxies and aliases **before** `DocumentRoot`, so those paths never reach the
fallback above. A request for `/rest/…` is proxied to the REST service and the
app never sees it — which is why the app cannot be responsible for 404s outside
its own routes.

## The metrics endpoint and its log

When a URL matches no route, the app renders its own "Page Not Found" view and
reports the requested path to the endpoint named by `metricsUrl` in
`public/config.json`. That endpoint has no file behind it: block **(1)** answers
it with 204 and no body, and block **(2)** writes the hit to its own log.

Because the app is served from `DocumentRoot`, `"metricsUrl": "/metrics"` pairs
with the bare `^metrics` pattern.

To keep tracking requests out of the main access log too, add `env=!ndex_metrics` to the
existing `CustomLog` line. Add the new file to logrotate.

**The `[R=204,L]` status is protocol, not style.** `204 No Content` is the only
response the app accepts as delivered; anything else, including a `200`, is
reported to the browser console as unexpected. Do not replace it with a rule
that serves a file or returns 200.

The `/metrics` prefix must match `metricsUrl` in `public/config.json`. Getting
it wrong breaks nothing for visitors — the request falls through to
`index.html`, the client discards it, and the not-found view still renders
correctly — but you lose the log line. Unlike before, that misconfiguration is
no longer invisible: the `200` from the fallback is exactly what the client now
flags in the console.

### What lands in the log

```
10.0.0.5 - - [14/Sep/2026:10:02:11 -0700] "GET /metrics/not-found?url=%2Fdoesnotexist HTTP/1.1" 204 - "Mozilla/5.0 ..."
```

There is deliberately no `Referer` field. It would have held the page the
visitor was on, which for `not-found` is the same bad URL — but that URL can
carry `?accesskey=<secret>` on a shared link, and this log is kept. The
requested path is already in the `url` parameter, with the query string
stripped, so nothing diagnostic is lost.

Count the day's bad URLs with:

```bash
# $7 is the request path in combined format; $9 is the status.
awk '$9 == 204 {print $7}' /var/log/httpd/ndex_443_metrics_log \
  | sed 's|^/metrics/||; s|?url=| |' | sort | uniq -c | sort -rn
```

```
     42 not-found %2Fdoesnotexist
      7 not-found %2Fnetworkset%2F
```

Values are form-encoded, so a space arrives as `+` rather than `%20` — decode
with something that understands form encoding before treating a result as a real
path. The request grammar, event names and parameters are specified in
[metrics-tracking.md](./metrics-tracking.md); what these counts do and do not mean
is in [not-found-routing.md](./not-found-routing.md).

## Deployment Steps

1. **Build:**
   ```bash
   npm run build
   ```

2. **Copy the static files into the DocumentRoot:**
   ```bash
   rsync -a --delete out/ /opt/ndex/ndex-webapp/
   ```
   `--delete` matters: stale files from a previous build are still served, since
   any real file short-circuits the fallback rule.

3. **Apply the Apache configuration** above, then check it before reloading:
   ```bash
   sudo apachectl configtest
   sudo systemctl reload httpd
   ```

A config reload is only needed when the vhost changes. Deploying a new build is
just step 2 — no Apache restart, and no cache to clear, because the entry points
are served `no-cache`.

## Available Routes

The static export supports both static and dynamic routes through a hybrid
approach.

### Static Routes (Pre-generated)
- `/` - Home page
- `/search/` - Search page
- `/my-account/` - My Account page
- `/profile/` - Profile page
- `/settings/` - Settings page
- `/shared-with-me/` - Shared with Me page
- `/trash/` - Trash page
- `/about/`, `/contact/`, `/faq/`, `/report-bug/` - Information pages
- `/docs/` and its sub-pages - Documentation

Each of these is a real directory in `out/`, so the `-f [OR] -d` guard serves it
directly and the fallback never sees it.

### Dynamic Routes (Client-side Rendered)
- `/folders/[uuid]/` - Folder pages
- `/users/[uuid]/` - User profile pages
- `/networkset/[uuid]/` - Legacy folder redirects (see [legacy-redirects.md](./legacy-redirects.md) for this and the other legacy URL rules)

### Everything Else
Any other path is handed to `index.html` just like the dynamic routes, and the
client router finds no match for it. It renders a "Page Not Found" view in place
— see [not-found-routing.md](./not-found-routing.md).

## Hybrid Routing for Static Export

Because of `output: 'export'`, the app uses a hybrid routing strategy to support
dynamic routes with unlimited UUIDs:

- **Static routes** are pre-built as HTML files and served straight from disk.
- **Dynamic routes** cannot be pre-generated, so the fallback rule hands them to
  `index.html` and the root `page.tsx` inspects the URL and renders the right
  component (`FolderViewer`, `UserPublicPage`).

This gives the benefits of static hosting while keeping dynamic pages working.
The consequence is that Apache cannot distinguish a valid deep link from a typo
— both are paths with no file — which is why not-found handling is necessarily
client-side.

## Content Fetching

The app fetches home-page content from whatever `uiContent.contentRootPath` in
`config.json` points at. Today that is an external host
(`home.ndexbio.org/landing_page_content/...`), which serves the files with
permissive CORS, so no proxy configuration is needed. The vhost also carries an
`Alias /contentrootpath` for serving that content locally instead — switching to
it is purely a `config.json` change.

## File Structure

The contents of `out/`, which become the contents of `/opt/ndex/ndex-webapp/`:

```
out/
├── index.html          # Entry point and client-routing fallback
├── 404.html            # Next's not-found export (unused behind the fallback)
├── config.json         # Runtime app configuration
├── serve.json          # Static-server rewrites, used by the Playwright suite
├── _next/              # Content-hashed JS/CSS assets
├── about/  contact/  faq/  report-bug/  docs/
├── search/  my-account/  profile/  settings/
└── shared-with-me/  trash/
```

## Subdirectory deployments

To serve the app under a path rather than at the root, set `urlBaseName` in
`public/config.json` (for example `/ndex3`) and rebuild — the build script
regenerates `next.config.ts` from it. In the vhost, use an `Alias` to the build
output instead of `DocumentRoot` and add `RewriteBase /ndex3/` to the
`<Directory>` block. Keep the metrics rule as `RewriteRule ^metrics(/|$)` and
prefix only the `SetEnvIf Request_URI` pattern with `/ndex3`: inside
`<Directory>`, Apache strips the mapped directory prefix before matching, so a
prefixed rule would never fire, while `SetEnvIf` still sees the full request
URI.

## Testing

After deploying, check that:

- the home page loads at the site root;
- a deep link such as `/folders/<uuid>/` renders the folder view directly, not
  the home page;
- an unknown URL such as `/doesnotexist` shows "Page Not Found" at that same
  URL, and produces a line in `ndex_443_metrics_log`.
