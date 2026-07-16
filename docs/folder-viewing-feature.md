# Folder Viewing Feature Design

## Overview

`/folders/{uuid}` renders a folder's contents for **every** visitor — anonymous,
signed-in non-owner, and owner — using a single page (`MyAccount`) and a single
set of API calls. The client sends only who the caller is (an auth token when
signed in, an access key when present in the URL); **the NDEx server decides
what to return**. The client renders whatever comes back and translates
permission/existence failures into friendly messages.

This replaces the earlier behavior where anonymous users hit an unimplemented
placeholder (the folder never rendered unless you were signed in — issue GI-33).

## Core principle

> The client tells the server who the viewer is. The server decides what the
> folder contains for that viewer. The client renders the result.

There is no client-side branching that changes the *data source* based on auth.
Authenticated and anonymous requests hit the same endpoints; only the presence
of a token (and optional access key) differs. This is why signing in is not
required to view a public or unlisted folder, and why a signed-in user always
sees exactly what the server grants them.

## Routing

| Environment | How `/folders/{uuid}` resolves |
| --- | --- |
| Dev (Next dev server) | File-system route `src/app/folders/[uuid]/page.tsx` → `FolderViewer` |
| Production (static export) | Apache/`serve` rewrites `/folders/**` → `index.html`; root `src/app/page.tsx` client-matches the path → `FolderViewer` |

Both paths converge on `FolderViewer`, which parses the optional
`?accesskey=` query parameter and renders `MyAccount`. Because the app sets
`trailingSlash: true`, deep links arrive as `/folders/{uuid}/`; the client-side
route matchers in `page.tsx` accept an optional trailing slash.

## Access key semantics

An access key is a **READ bypass** for a resource. Format: `?accesskey={key}`.

- Works for anonymous **and** signed-in viewers — whenever present it is passed
  to the API call.
- Granting READ on a folder **cascades** to the folder's contents: contained
  networks (and shortcut targets) can be downloaded / opened using the same key.
- Passed through: URL → `FolderViewer` → `MyAccount` → `useFolder` /
  `useFolderContents` (folder metadata + list), `FileRenderer` (folder and
  network double-click navigation), `SelectionToolbarAndFilters` (bulk
  download), and `ActionDropdown` (download, copy, and Cytoscape actions).
- Downstream URLs use the same lower-case query parameter:
  `/viewer/networks/{uuid}?accesskey={key}` and
  `{cytoscapeWebUrl}/0/networks/{uuid}?accesskey={key}`. Cytoscape Desktop
  receives the key as the CyNDEx access-key argument.

## Permission model

Two concepts, computed once and threaded down:

- **`canEditFolder`** (`src/lib/utils/permissions.ts`): `isAuthenticated && the
  signed-in user owns the folder`. Drives folder-level UI: sidebar, bulk
  toolbar actions, drag-and-drop, breadcrumb root, "Add Shortcut" target.
- **Per-item permission** (`ActionDropdown`): `isOwner` (item.owner === user) or
  `canEditItem` (owner or `item.permission === WRITE`). Drives which per-item
  actions are enabled.

| Viewer | Folder contents | Edit actions |
| --- | --- | --- |
| Anonymous | Whatever the server returns | **Greyed out** (visible, disabled, "Sign in to use this feature" tooltip) |
| Anonymous + valid access key | Contents (READ) | Greyed out |
| Signed-in non-owner | Whatever the server returns (read-only for v1) | Greyed out per item |
| Signed-in owner | Full contents | All enabled |

## Action menu specification

Actions are decided by **viewer class × per-item permission × item type**.

### Item type gating

- **Download** and **Open in Cytoscape** (Desktop and Web) are **network-only**
  actions. They never appear for folders or shortcuts-to-folders.
- For **shortcuts to networks**, these actions resolve the shortcut chain and
  operate on the **target network's** UUID, never the shortcut's own UUID
  (`src/lib/utils/shortcut-resolver.ts`).
- Folder rows and shortcut-to-folder rows always render the folder menu, for
  every viewer (fixes a prior bug where anonymous users saw the network menu on
  a folder).

### Viewer gating

- **Anonymous**: READ actions (Download, Open in Cytoscape Desktop/Web) enabled;
  all edit actions greyed out with a sign-in tooltip.
- **Signed-in**: per-item — owner gets everything; WRITE permission gets
  edit-level actions; otherwise read-only. "Make a Copy" and "Add a Shortcut"
  write into the *viewer's own* account, so any signed-in user gets them (a
  non-owner's "Add a Shortcut" targets their own home folder).
- **Move to Trash** stays hidden for signed-in non-owners; greyed for anonymous.

## Error states

Mapped from the typed `NDExError.statusCode` via `src/lib/utils/ndex-errors.ts`
and rendered by the shared `FolderErrorState` component:

| Status | Message | Extra |
| --- | --- | --- |
| 401 / 403 | "You don't have permission to view this folder" | Anonymous: sign-in button + "sign in if it was shared with you"; signed-in: "ask the owner for access or an access link" |
| 404 | "This folder doesn't exist" | "It may have been deleted, or the link may be incorrect." |
| other | "Error loading content" | generic detail |

Expected view errors (401/403/404) are **not** logged to the console — they are
normal user-facing states, not application bugs.

## UI/UX behavior

- **Sidebar** (`SideBar`): shown only to signed-in viewers (owners and
  non-owners — it navigates *their* account). Anonymous viewers get the
  full-width listing.
- **Breadcrumbs**: the trail is rooted at "My Drive" only for the folder owner;
  other viewers see a trail starting at the highest ancestor they can read (the
  walk stops quietly at the first inaccessible parent).
- **Selection toolbar**: bulk Download always available; bulk Share / Move /
  Move-to-Trash / Set-Read-only greyed out unless `canEditFolder`.
- **Drag-and-drop**: enabled only when `canEditFolder`.
- **Loading**: while Keycloak restores the session (`isInitializing`) the page
  shows a spinner; SWR `keepPreviousData` avoids a loading flash when the auth
  state resolves after an initial anonymous fetch.

## Architecture

### Data flow

```
/folders/{uuid}?accesskey=KEY
    │
    ▼
FolderViewer (parses accesskey)
    │
    ▼
MyAccount(uuid, accessKey)
    ├── useFolder(uuid, accessKey)          → folder metadata (owner, name)
    ├── useFolderContents(uuid, accessKey)  → folder listing
    ├── canEditFolder(folder, user, isAuth) → folder-level UI gating
    ├── SelectionToolbarAndFilters(canEditFolder, accessKey)
    ├── FileRenderer(canEditFolder, accessKey)
    │       ├── FoldersList(accessKey)       → child-folder navigation
    │       └── NetworksList(accessKey)      → Network Viewer URL
    └── ActionDropdown(canEditFolder, accessKey)
            └── resolveNetworkTarget(..., accessKey)
                    → shortcut → target network + effective key
```

### Shared modules introduced

| Module | Responsibility |
| --- | --- |
| `src/lib/utils/ndex-errors.ts` | Typed error guards (`isAuthError`, `isNotFoundError`, `isExpectedViewError`) |
| `src/lib/utils/permissions.ts` | `isItemOwner`, `canEditItem`, `canEditFolder` |
| `src/lib/utils/shortcut-resolver.ts` | `resolveNetworkTarget` (chain resolution), `targetsNetwork`, `targetsFolder` |
| `src/components/shared/FolderErrorState.tsx` | Friendly 401/403/404/generic card |
| `src/components/shared/MenuItemButton.tsx` | Unified enabled/disabled/greyed menu row |
| `folderContentsKey` / `folderKey` (in `use-folder.ts`) | SWR cache-key builders (token at index 2 for mutate filters; null while initializing) |

### Singleton auth fix

`getNdexClient` (`src/lib/api/ndex-client-manager.ts`) is a shared singleton.
It now **clears** auth when called without a token, so a token set by an earlier
authenticated call can't leak into a request meant to be anonymous. This is
essential to the "send only who the viewer is" principle.

## Testing

- **Unit (Jest)**: `ndex-client-manager` (auth clear/set), `ndex-errors`,
  `permissions`, `shortcut-resolver` (chain/status/folder-target/accesskey),
  `use-folder` (anonymous/authenticated/accesskey/initializing key building,
  error passthrough), `ActionDropdown` (the full viewer × type matrix),
  `FolderErrorState` (variants).
- **E2E (Playwright)**: `test/playwright/folder-view.spec.ts` — anonymous public
  folder renders, private folder shows the permission message + sign-in, access
  key renders a private folder and reaches the Network Viewer URL, bad UUID
  shows not-found, sidebar absent for anonymous. Keycloak silent SSO is
  short-circuited in the fixture so init resolves as anonymous deterministically.

## Related

- `docs/REMAINING_ISSUES.md` — open questions that could change this spec.
- `docs/my-account-page.md` — the page reused for the folder view.
- `docs/open-in-cytoscape-desktop.md` — shortcut resolution now shared.
