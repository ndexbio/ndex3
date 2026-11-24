<!-- Keep a Changelog repeats "### Added" etc. under each release by design. -->
<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Legacy NDEx2 group links (`#/group/{uuid}`) now redirect to the folder view.
  The migration turned each group into a folder with the same UUID, so these
  links land on that folder in one hop
  ([#67](https://github.com/ndexbio/ndex3/issues/67)). The old group-permissions
  link, `#/access/group/{uuid}`, is not redirected because NDEx3 has no
  equivalent screen. See [docs/legacy-redirects.md](./docs/legacy-redirects.md).

## [3.0.1] - 2026-09-14

### Added

- Unrecognized URLs now render a "Page Not Found" view in place, at the URL that
  was requested, instead of silently showing the home page
  ([#48](https://github.com/ndexbio/ndex3/issues/48)).
- Optional `metricsUrl` in `public/config.json`: a best-effort, fire-and-forget
  tracking endpoint, defaulting to `/metrics`. Set it to an empty string to turn
  tracking off. Not-found events report the requested path — never the query
  string, which can carry an access key — so the hosting server can log bad URLs
  to a dedicated file. Delivery failures are invisible to users and warn once to
  the browser console; nothing in the UI depends on the endpoint being
  reachable. See [docs/metrics-tracking.md](./docs/metrics-tracking.md) for the
  request format and [docs/not-found-routing.md](./docs/not-found-routing.md)
  for the behaviour.

### Changed

- Apache deployment guidance adds a resource-less `/metrics` endpoint answered
  with 204 and a dedicated `ndex3_metrics.log`. The SPA catch-all rewrite is
  unchanged.

