# Legacy Redirect Rules

## Overview

NDEx2 (the previous frontend) used hash-based client-side routing (`#/network/{id}`, `#/networkset/{id}`) and was served from `public.ndexbio.org`. Links to that app — bookmarks, DOIs, external citations — still circulate, so NDEx3 redirects them to the equivalent NDEx3 (or sibling app) URL.

There are **three independent redirect rules**, implemented in **two separate places**, because they operate on different parts of the URL:

| # | Rule | Input | Output | Implementation |
|---|------|-------|--------|-----------------|
| 1 | Host canonicalization | any URL on `public.ndexbio.org`, or http on either prod host | same URL on `https://www.ndexbio.org` | [`legacyRedirect.ts`](../src/utils/legacyRedirect.ts) → `resolveHostRedirect` |
| 2 | Hash-fragment rewrite | `#/network/{id}...` or `#/networkset/{id}...` | `/viewer/networks/{id}...` or `/folders/{id}...` | [`legacyRedirect.ts`](../src/utils/legacyRedirect.ts) → `resolveFragmentRedirect` |
| 3 | Legacy pathname route | `/networkset/{id}` (no hash) | `/folders/{id}` | [`src/app/page.tsx`](../src/app/page.tsx) (`networksetMatch` block) |

Rules 1 and 2 are composed by `resolveLegacyRedirect()` and fire together from one component; rule 3 is a completely separate code path. See "Why two mechanisms" below.

## Rule 1 & 2: `legacyRedirect.ts` + `LegacyHashRedirect`

**Where it runs**: [`LegacyHashRedirect.tsx`](../src/components/LegacyHashRedirect.tsx) is mounted unconditionally at the top of [`layout.tsx`](../src/app/layout.tsx#L58), so it runs on every page load across the whole app. It reads `window.location.href` in a `useEffect`, computes the target via `resolveLegacyRedirect()`, and — if the target differs from the current URL — issues a full navigation via `window.location.replace()` (not `router.replace`, since this must also rewrite the host/origin, which client-side routing can't do). `replace()` keeps the legacy URL out of browser history.

### Rule 1 — `resolveHostRedirect(url)`
- `public.ndexbio.org` → `www.ndexbio.org` (host rewrite)
- Forces `https:` for either production host (`www.ndexbio.org` or `public.ndexbio.org`), regardless of path/hash
- Non-production hosts (e.g. `localhost`) are left alone
- Runs **unconditionally** — independent of whether the URL matches any known legacy path/hash pattern. A link to `http://public.ndexbio.org/#/user/abc` still gets its host and protocol fixed even though `#/user/abc` isn't a recognized fragment pattern (see Rule 2)
- Returns `null` if the origin is already correct (nothing to do)

### Rule 2 — `resolveFragmentRedirect(url)`
- Only reads `url.hash` — pathname is ignored, so it fires the same way whether the browser landed on `/` or `/index.html`
- Recognized patterns (`FRAGMENT_ROUTE_MAP` in `legacyRedirect.ts`):
  | Legacy fragment | New path |
  |---|---|
  | `#/network/{id}` | `/viewer/networks/{id}` — the **NDEx Network Viewer**, a sibling app on the same host, not a route in this Next.js app |
  | `#/networkset/{id}` | `/folders/{id}` — a route inside this app |
- Any trailing query string on the fragment (e.g. `?accesskey=...`) is carried across unchanged. The destination `/folders/{id}?accesskey=...` now honors that access key end-to-end: `FolderViewer` parses it and passes it to the folder API calls as a READ bypass (see [`docs/folder-viewing-feature.md`](./folder-viewing-feature.md)).
- Returns `null` if the hash doesn't start with `#/` or doesn't match a known prefix — the hash is left alone (host canonicalization from Rule 1 can still apply independently)

### Composition — `resolveLegacyRedirect(href)`
Combines both rules into a single target URL so `http://public.ndexbio.org/#/network/{id}` redirects in **one hop** (fixed host + rewritten path) instead of two round trips. If neither rule applies, returns `null` and no redirect happens.

**Tests**: [`legacyRedirect.test.ts`](../src/utils/legacyRedirect.test.ts) covers all three functions independently plus their composition (host-only, fragment-only, both, neither, `index.html` paths, unrecognized hashes).

## Rule 3: legacy `/networkset/{id}` pathname route

**Where it runs**: [`page.tsx`](../src/app/page.tsx#L56-L67), the root route component. Because this app uses static export (`output: 'export'`) with client-side routing for dynamic UUID paths (see [`docs/APACHE_STATIC_DEPLOYMENT.md`](./APACHE_STATIC_DEPLOYMENT.md#hybrid-routing-for-static-export)), Apache's catch-all rewrite sends any unrecognized path — including `/networkset/{id}` — to `index.html`, which mounts `HomePage`. `HomePage` pattern-matches the pathname and, for `/networkset/{id}`, calls `router.replace('/folders/{id}')` — a client-side SPA navigation (no full page reload, unlike Rules 1 & 2).

This is **not the same URL shape** as Rule 2's `#/networkset/{id}` — this is a bare path with no hash. It's a distinct legacy link format that predates or coexists with the hash-router era and needs its own handling since the fragment never reaches the server or `LegacyHashRedirect` in a form Rule 2 would recognize (Rule 2 only inspects `url.hash`).

> **Trailing-slash note:** the `networksetMatch`, `folderMatch`, and `userMatch` patterns in `page.tsx` each accept an optional trailing slash (`/…\/?$/`). This matters because the app sets `trailingSlash: true`, so a statically-served deep link arrives as `/networkset/{id}/` (or `/folders/{id}/`). Without the optional slash these client-side matchers would miss and fall through to the home page.

**Tests**: none currently — this path isn't covered by a dedicated unit test (unlike Rules 1 & 2).

## Why two mechanisms for the same conceptual migration

Rule 2 (`#/networkset/{id}` → `/folders/{id}`) and Rule 3 (`/networkset/{id}` → `/folders/{id}`) both migrate "networkset" links to the folders route, but:
- They match different URL shapes (hash fragment vs. real pathname) and can't share a matcher — a fragment is invisible outside the browser (`url.hash`), while a path is visible to the server/router.
- They use different navigation primitives: Rule 2 must do a full-page `window.location.replace()` (it may also be fixing the host), while Rule 3 can use Next's client-side `router.replace()` since it never needs to change origin.
- They live in different components: Rule 2 runs globally from the root layout; Rule 3 runs only when the root page component itself handles the route.

If a new legacy pattern needs to be added, check the URL shape first — hash-fragment patterns belong in `FRAGMENT_ROUTE_MAP` in `legacyRedirect.ts`; bare legacy pathnames belong alongside the `networksetMatch` block in `page.tsx`.

## Out of scope

The **"Open in Cytoscape Web"** action (see [README](../README.md) and [`ActionDropdown.tsx`](../src/app/my-account/_components/ActionDropdown.tsx)) navigates to a sibling app using the `cytoscapeWebUrl` config value. It's an external hand-off to another application, not a legacy-URL migration, and isn't covered by this document.
