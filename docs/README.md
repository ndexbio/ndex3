# ndex3 documentation

Start here. Every document below carries front matter with a `status` and a
`last-verified` date — check it before trusting the detail.

## How this is organised

| Kind | Lives in | Answers |
| --- | --- | --- |
| Explanation | `docs/*.md` | Why the design is this way |
| Decisions | [`docs/decisions/`](./decisions/) | Why we chose this over the alternative |
| Reference | TSDoc, next to the code | What a function takes and returns |
| Behaviour | `src/**/*.test.*`, `test/playwright/` | What it actually does |
| How-to | [`README.md`](../README.md), [`CLAUDE.md`](../CLAUDE.md) | How to run, build and deploy |

Feature docs explain **why**; they do not restate the code. Avoid pasting code
excerpts or line numbers into them — both rot silently and neither is checked by
anything. Link to a file or a symbol name instead.

## Features

| Document | Covers |
| --- | --- |
| [doi-certification.md](./doi-certification.md) | Requesting a DOI, pre-certification, adding the reference, failed mints, cancellation, and everything a DOI locks |
| [ndex-share-feature.md](./ndex-share-feature.md) | Sharing networks and folders: permissions and visibility |
| [move-files-feature.md](./move-files-feature.md) | Moving networks, folders and shortcuts between folders |
| [folder-viewing-feature.md](./folder-viewing-feature.md) | Browsing folder contents, including shared and key-accessed folders |
| [search-feature.md](./search-feature.md) | Network and folder search, filters and pagination |
| [search-feature-user-search.md](./search-feature-user-search.md) | Searching for users |
| [my-account-page.md](./my-account-page.md) | The My Account workspace: tabs, listings and selection |
| [user-public-page-design.md](./user-public-page-design.md) | Public user profile pages |
| [open-in-cytoscape-desktop.md](./open-in-cytoscape-desktop.md) | Handing a network to Cytoscape Desktop via CyNDEx-2 |
| [legacy-redirects.md](./legacy-redirects.md) | Redirecting NDEx2 URL shapes to their NDEx3 equivalents |

## Configuration and deployment

| Document | Covers |
| --- | --- |
| [CONFIG_SYSTEM.md](./CONFIG_SYSTEM.md) | The single-source-of-truth config in `public/config.json` |
| [CONTENT_SYSTEM_README.md](./CONTENT_SYSTEM_README.md) | Dynamic home-page content |
| [CONTENT_CONFIGURATION.md](./CONTENT_CONFIGURATION.md) | Configuring content sources |
| [APACHE_STATIC_DEPLOYMENT.md](./APACHE_STATIC_DEPLOYMENT.md) | Serving the static export behind Apache |

## Other

| Document | Covers |
| --- | --- |
| [REMAINING_ISSUES.md](./REMAINING_ISSUES.md) | Known issues not yet scheduled |

## Keeping these honest

`npm run check:docs` verifies that every `src/…` path mentioned in `docs/` and
every relative Markdown link actually exists. It runs in CI. It cannot tell you
whether the *prose* is still true — that is what `last-verified` is for.
