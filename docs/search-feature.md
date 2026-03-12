# NDEx3 Search Feature Specification

## Table of Contents
1. [Overview](#overview)
2. [Requirements](#requirements)
3. [UI/UX Design](#uiux-design)
4. [Architecture & Design](#architecture--design)
5. [Data Flow](#data-flow)
6. [Component Specification](#component-specification)
7. [Filter System](#filter-system)
8. [Search History & Autocomplete](#search-history--autocomplete)
9. [Permissions & Actions](#permissions--actions)
10. [Implementation Plan](#implementation-plan)
11. [Files Reference](#files-reference)
12. [Performance Considerations](#performance-considerations)
13. [Error Handling](#error-handling)

---

## 1. Overview

### Purpose
A Google Drive-inspired search feature for the NDEx3 web application that allows users to search for networks, folders, and shortcuts across NDEx. The search uses the v3 `files.searchFiles` API and presents results in the same two-pane layout as the My Account page (folders on top, networks on bottom) for UI consistency and component reuse.

### Key Design Decisions
- **Three-tab design** (My Networks, Public, Private & Unlisted) for signed-in users
- **My Networks tab uses dedicated API calls** with `accountName` parameter for accurate server-side filtering and pagination, rather than client-side filtering of bulk results
- **Tabs (not sidebar)** to visually distinguish the search results page from the My Account page, which uses a sidebar for navigation
- **"My Networks" tab** solves the problem of a user's own networks being split across two Solr indexes by visibility — it merges results from both indexes where the user is the owner, sorted by modification date
- **Virtualized lists** using `@tanstack/react-virtual` for smooth scrolling with large result sets
- **Reuse My Account components** (`FoldersList`, `NetworksList`, `FileRenderer`, `SelectionToolbarAndFilters`, `ActionDropdown`) for UI consistency and reduced development effort
- **Permission-based actions** rather than tab-based or role-based restrictions
- **Shared filter state across file tabs** so filter settings persist when switching between My Networks, Public, and Private & Unlisted tabs

---

## 2. Requirements

### 2.1 Functional Requirements

#### Search Scopes
- **Anonymous users**: Search only the public index (1 API call). No tabs are shown — results are displayed under a simple "Results (N)" header since there is only one result set.
- **Signed-in users**: Four parallel API calls are made. Results displayed in three tabs: My Networks, Public, and Private & Unlisted.

> **Note**: User search (searching for NDEx user accounts) is not implemented in this version of NDEx3. The original design included a Users tab alongside the file tabs. See `docs/search-feature-user-search.md` for the full user search design if this feature is needed in a future version.

#### Default Tab
- **Anonymous users**: Results displayed directly (no tabs)
- **Signed-in users**: My Networks tab by default. Rationale: a signed-in user is most likely looking for their own content. This tab merges the user's own networks from both indexes into one view, solving the problem of their content being split across Public and Private by visibility.

#### Search Entry Point
- The existing `SearchBox` in the NavBar is the primary entry point
- User types a query and presses Enter to submit
- Navigation goes to `/search?q=<encoded-query>`

#### Result Types
- Networks
- Folders (clickable to navigate into, same as Google Drive behavior)
- Shortcuts (for both networks and folders)

#### Filters
- **Edge count**: Client-side filter with min/max range inputs (Phase 1)
- Additional filters (node count, modification date, creation date) planned for future phases

### 2.2 Non-Functional Requirements
- Static export compatible (no server-side features)
- Consistent with existing My Account page UI patterns
- Responsive design

---

## 3. UI/UX Design

### 3.1 Page Layout

The search results page reuses the My Account page layout pattern (without the sidebar):

```
+-----------------------------------------------------------------------+
|  NavBar with SearchBox                                                 |
+-----------------------------------------------------------------------+
|  +-------------------------------------------------------------------+|
|  | [My Networks (55)] [Public (2,341)] [Private (47)]  [Sorted by relevance]  L/G  i ||
|  +-------------------------------------------------------------------+|
|  | All filters  [Edge: 200-400 x]                                    ||
|  +-------------------------------------------------------------------+|
|  |  Folders & folder shortcuts (top pane)                            ||
|  |  --------------------------------------------------------------   ||
|  |  Networks & network shortcuts (bottom pane)                       ||
|  +-------------------------------------------------------------------+|
+-----------------------------------------------------------------------+
```

### 3.2 Tab Bar

Horizontal tabs at the top of the content card. For signed-in users, three tabs are shown:

- **My Networks (N)** or **My Networks (N+)** — default tab. Uses two dedicated API calls with `accountName` parameter for server-side owner filtering. Merges the user's public and private results, sorted by modification date descending. Each row displays a visibility badge (Public/Private). The tab count is the sum of `numFound` from both user-scoped calls — always accurate. When either call's results are truncated (loaded items < `numFound`), the count shows a `+` suffix (e.g., "My Networks (5,533+)") and an inline message appears above the results: "Showing 4,533 of 5,533 results — refine your search to see all matches." When all results fit within the 3,000-per-call limit, the count is exact and no `+` or message is shown.
- **Public (N)** — shows `numFound` from the public `searchFiles` call. Results sorted by Solr relevance within the public index. Contains all public content across NDEx, not just the user's own.
- **Private & Unlisted (N)** — shows `numFound` from the private `searchFiles` call. Results sorted by Solr relevance within the private index. Contains all private content the user has access to (owned + shared).

For anonymous users, **no tabs are shown**. Since there is only one result set (public networks), a tab bar adds no value. Instead, a simple "Results (N)" header is displayed above the results, where N is the `numFound` from the public search. The visibility column is hidden since all results are public. The actions column (hamburger menu) is shown but only offers Open in Cytoscape Desktop and Download — all other actions require authentication. When the user signs in, the layout switches to the full three-tab set (My Networks, Public, Private & Unlisted). Any stale `?tab=` URL parameter is removed on sign-out.

All API calls fire in parallel on search submit so counts are ready immediately, but only the active tab's results are rendered. For signed-in users: 4 calls (2 for My Networks + 1 Public + 1 Private). For anonymous users: 1 call (1 Public).

#### Why Three Tabs

A signed-in user's networks are split across two Solr cores by visibility: their public networks are in the public index and their private networks are in the private index. The "My Networks" tab solves this by using the `accountName` parameter to fetch only the user's own networks from each index, then merging them client-side. This gives users a single view of all their matching content regardless of visibility.

The "Public" and "Private" tabs provide focused, relevance-ranked browsing within a single Solr core. Solr relevance scores are only meaningful within a single core, not across cores, so these tabs preserve the native Solr ranking.

"Shared with me" was considered as a file tab but dropped because the `searchFiles` API has no server-side parameter to exclude a specific owner. Implementing it would require client-side filtering of paginated results, which produces inaccurate counts and incomplete content. It may be added in a future phase if the API adds support for an `excludeAccountName` parameter.

#### API Calls per Tab

For signed-in users, 4 API calls are made in parallel on each search:

| API Call | Visibility | accountName | Page size | Serves tab |
|----------|-----------|-------------|-----------|------------|
| `searchFiles(PUBLIC, accountName=me)` | PUBLIC | Current user | 3,000 | My Networks |
| `searchFiles(PRIVATE, accountName=me)` | PRIVATE | Current user | 3,000 | My Networks |
| `searchFiles(PUBLIC)` | PUBLIC | — | 500 | Public |
| `searchFiles(PRIVATE)` | PRIVATE | — | 500 | Private |

For anonymous users, 1 API call is made:

| API Call | Visibility | Page size | Serves |
|----------|-----------|-----------|--------|
| `searchFiles(PUBLIC)` | PUBLIC | 500 | Networks (labeled "Networks" for anonymous) |

The My Networks calls use `accountName` for server-side filtering, so `numFound` is always accurate (it reflects the true total in each index). This tab does not paginate — it makes a single fetch of up to 3,000 items per call and stops. The large fetch size means most users' entire result set is returned in one call (~98% of users have fewer than 3,000 matching results per index). When either call returns fewer items than its `numFound` (i.e., results are truncated at the 3,000 limit), two things happen:

1. **Tab header**: The count shows a `+` suffix — e.g., "My Networks (5,533+)" where 5,533 = `publicNumFound + privateNumFound`. The `+` signals that not all matching results are displayed.
2. **Inline message**: A message appears above the results list: "Showing 4,533 of 5,533 results — refine your search to see all matches." (where 4,533 = actual loaded items from both calls).
3. **Info icon on filter bar** (My Networks tab only): When truncation is active, an info icon (ℹ) appears next to the filter controls with a tooltip: "Filters, sorting, and actions apply only to the loaded results, not the full match count." This is only shown when results are truncated — in the common case (no truncation), the icon is hidden. This icon does not appear on the Users tab because the filter bar is hidden there (see Section 3.4); instead, the Users tab's inline message (item 2) is the sole truncation indicator beyond the `+` suffix.

**Truncated results contract**: When the My Networks or Users tab is truncated, all client-side operations — filtering, sorting, selection, and bulk actions — operate exclusively on the loaded subset. They do not apply to the items beyond the fetch limit. This means:
- A filter that hides 500 items from the loaded 4,533 shows 4,033 results, not `numFound` minus 500.
- Sorting reorders only the loaded items.
- "Select all" selects only loaded items. Bulk actions (e.g., change visibility) apply only to the selection.
- The tab header count (`N+`) always reflects the server's `numFound` sum, regardless of client-side filters. The inline message updates to reflect filtered counts: "Showing 4,033 of 5,533 results (filtered from 4,533 loaded)."

When all results fit within the 3,000-per-call limit (the common case for ~98% of users), the count is exact and none of the truncation indicators (the `+` suffix, inline message, or filter bar info icon) are shown.

The Public and Private calls use a page size of 500 with infinite scroll for additional pages, since these tabs can return tens of thousands of results.

#### Tab Data Summary

| Tab | Data source | Sort | Pagination |
|-----|-------------|------|------------|
| My Networks | 2 dedicated API calls with `accountName=me`, merged | Column-header sorting: Last modified (default desc), Name, Edge count | Single fetch, no pagination (3,000 cap per call; truncated results show `+` count and inline message) |
| Public | 1 API call, all public results | Fixed: Relevance (server order) | Infinite scroll (500 per page) |
| Private | 1 API call, all private results | Fixed: Relevance (server order) | Infinite scroll (500 per page) |

Only the My Networks tab supports user-controlled sorting, via clickable column headers in `FoldersList` and `NetworksList` (no dropdown). Public and Private & Unlisted tabs use fixed server-order relevance with a static badge — see Section 3.3 for the rationale.

#### Why Modification Date for My Networks Tab

Solr relevance scores from different cores are not directly comparable. TF-IDF/BM25 scores depend on index-specific statistics (document frequency, total documents, average field length). A score of 12.5 in the public core (millions of docs) means something different from 12.5 in the private core (hundreds of docs).

Modification date is a universal, comparable field across both indexes. Users viewing their own networks care about recency ("which of my cancer networks did I work on recently?") more than cross-index relevance ranking.

Future enhancement: if the API exposes Solr scores, normalized score ranking (`score / maxScore` per core) could be used instead of modification date for the My Networks tab.

### 3.3 Header Bar

Same horizontal bar as My Account's header area:

- **Left side**: Search query display (e.g., breadcrumb-style: `Search > "cancer"`)
- **Right side**: Relevance badge (on fixed-sort tabs) + List/Grid view toggle + Details panel toggle

#### Sorting Strategy

Sorting behavior differs by tab based on whether results are paginated:

| Tab | Sort behavior | Rationale |
|-----|--------------|-----------|
| My Networks | **Column-header sorting.** Users click Name or Last modified column headers in `FoldersList`, and Name, Edge count, or Last modified column headers in `NetworksList`, to sort (asc/desc toggle). Default: Last modified descending. **The two panes have independent sort contexts** — sorting folders by Name does not affect the networks pane, and vice versa. This is intentional: folders and networks have different column sets (e.g., folders have no Edge count), and each pane's sort state is owned by its own component (`useState`), consistent with how My Account already works. | All results are loaded in a single fetch (up to 3,000 per call), so client-side sorting of the full result set works correctly. |
| Public | **Fixed: Relevance (server order).** A static green badge `Sorted by relevance` is shown in the header bar. No sort controls. | Uses infinite scroll pagination (500 per page). Client-side sorting would only reorder the currently loaded pages, not the full result set — producing misleading results. |
| Private | **Fixed: Relevance (server order).** Same as Public. | Same pagination concern as Public. |

The `FoldersList` and `NetworksList` components already support clickable column headers with sort toggle (asc/desc/none) for Name and Last Modified. Each component owns its sort state internally via `useState` (FoldersList line 389, NetworksList line 495), creating two independent sort contexts — this is intentional and no shared parent sort state is needed. For search, a new `sortable` prop is needed (see Section 6.3): on the My Networks tab, `sortable={true}` enables column-header sorting (with Edge count added to `NetworksList`); on Public and Private tabs, `sortable={false}` suppresses sort icons and click handlers so the server-order relevance is preserved.

See `docs/search-feature-ui-mock.svg` for the visual mockup of the relevance badge and tab layouts.

### 3.4 Content Area

#### File Tabs (My Networks, Public, Private & Unlisted)

Two-pane layout reusing `FileRenderer` pattern:

- **Top pane**: `FoldersList` — shows folders and folder-type shortcuts matching the search
- **Bottom pane**: `NetworksList` — shows networks and network-type shortcuts matching the search

Both components are configured with:
- `showOwnerColumn={true}` — always show owner (users are discovering content across NDEx)
- `showVisibilityColumn` — varies by tab:
  - **My Networks**: `true` — items have mixed visibility (public + private merged)
  - **Public / Networks (anonymous)**: `false` — all items are public, column adds no information
  - **Private**: `true` — items may be private or unlisted
- Selection support enabled for signed-in users

**Shortcuts in search results**: Shortcut rows show an empty Edges column (rather than "0") since shortcuts are references, not networks with edges.

Clicking a folder navigates into it (same behavior as My Account and Google Drive). The folder's contents may or may not relate to the original search query — this is expected and consistent with Google Drive's behavior.

### 3.5 Empty States

**Initial state** (navigated to `/search` with no `q` parameter):
- Centered panel with search icon
- Heading: "Search NDEx Networks"
- Brief description of NDEx
- Clickable example query chips (e.g., "cancer", "SARS-CoV-2", "PI3K pathway", "p53")
- For anonymous users: a note "Sign in to also search your private networks"

**No results**:
- Search icon with X
- "No results for '[query]'"
- Suggestions: check spelling, try broader terms, remove filters (if any active)

**Loading**: Skeleton matching the two-pane layout

### 3.6 Details Panel

Reuse the existing `DetailsPanel` component with `useResizablePanel` hook. Toggled via the Info button in the header bar, same as My Account.

---

## 4. Architecture & Design

### 4.1 API

The search uses `files.searchFiles()` from the `@js4cytoscape/ndex-client` v3 API.

#### `FileSearchParams` Interface
```typescript
interface FileSearchParams {
  searchString?: string;      // Search terms, supports Lucene syntax
  accountName?: string;       // Filter by owner username
  permission?: Permission;    // Filter by permission level (signed-in only)
  type?: NDExFileType | null; // Filter by file type
  visibility: 'PRIVATE' | 'PUBLIC';  // Required - which index to search
  start?: number;             // Pagination offset
  size?: number;              // Page size
}
```

#### Response Shape
```typescript
interface FileSearchResult {
  files: FileListItem[];  // Array of FileListItem objects
  start: number;          // Starting index
  numFound: number;       // Total matches in the index
}
```

**Key constraint**: A single `searchFiles` call can only search one visibility (`PUBLIC` or `PRIVATE`). For signed-in users, four parallel calls are made: two for the My Networks tab (with `accountName` for server-side owner filtering) and one each for the Public and Private tabs.

### 4.2 Data Type Mapping

The API returns `FileListItem` objects. The app uses `FileItemBase` internally. These types are compatible, with a mapping pattern already established in `use-shared-files.ts`:

```typescript
// FileListItem -> FileItemBase mapping
{
  uuid: item.uuid,
  name: item.name,
  type: item.type,
  modificationTime: item.modificationTime,
  owner: item.owner,
  ownerUUID: item.ownerUUID || item.owner_id,
  visibility: item.visibility,
  edges: item.edges,
  permission: item.permission,
  attributes: { ...item.attributes }
}
```

The server returns `owner` as a username (e.g., `"cjtest"`) and `owner_id` as a UUID for all item types (folders, networks, and shortcuts). The `owner_id` field is not declared in the `FileListItem` type, so it is accessed via a cast and mapped to `ownerUUID`.

### 4.3 Available Fields on `FileListItem`

| Field | Type | Available for filtering |
|-------|------|------------------------|
| `uuid` | string | - |
| `name` | string | Via `searchString` (server-side) |
| `type` | NDExFileType | Via `type` param (server-side) |
| `modificationTime` | number | Client-side |
| `owner` | string | Via `accountName` param (server-side) |
| `visibility` | Visibility | Via `visibility` param (server-side) |
| `edges` | number | Client-side |
| `permission` | Permission | Via `permission` param (server-side) |
| `DOI` | string | Client-side |
| `isValid` | boolean | Client-side |
| `warnings` | string[] | Client-side |

Note: `FileListItem` has an `edges` field but no direct `nodes` field. Node count may be available in `attributes` but this needs verification.

### 4.4 State Management

#### Search Store (`useSearchStore`)
Extend the existing Zustand store with filter state:

```typescript
// Existing state (preserved)
interface SearchState {
  query: string;
  previousQueries: string[];
  searchCount: number;
  lastSearchTime: number | null;
}

// New filter and sort state to add
interface SearchFilterState {
  edgeCount: { min: string; max: string };
  // Future: nodeCount, modificationTime, creationDate
}

// Sort options (My Networks tab only — Public/Private use fixed server-order relevance)
type MyNetworksSortField = 'name' | 'modificationTime' | 'edgeCount';
type SortDirection = 'asc' | 'desc';
```

Filter state is shared across all three tabs — changing a filter applies to all.

#### SWR for Server State
Each unique combination of `(query, visibility, accountName, pageIndex)` produces a unique SWR cache key. For signed-in users, four independent SWR hooks run in parallel (2 for My Networks with `accountName`, 1 for Public, 1 for Private).

### 4.5 URL Parameters

Search state is reflected in URL parameters for deep-linking and bookmarking:

```
/search?q=cancer                  # Basic search (defaults to My Networks for signed-in, Networks for anonymous)
/search?q=cancer&tab=my-networks  # My Networks tab
/search?q=cancer&tab=public       # Public tab
/search?q=cancer&tab=private      # Private & Unlisted tab
```

#### URL as Single Source of Truth for Active Query

**The URL `q` parameter is the single source of truth for the active search query.** This is a change from the current code, where search state is split across three locations:

1. **URL** (`?q=`) — `SearchBox` reads it on mount
2. **Local component state** — `SearchBox.currentQuery` (controls the input field)
3. **Zustand store** (persisted to localStorage) — `useSearchStore.query`

This split causes deep links and reloads to diverge: the Zustand store may hold a stale query from a previous session while the URL has the correct one. The current `TabsPanel` reads `query` from the store (not the URL), so a direct navigation to `/search?q=cancer` may show results for whatever query was last stored.

**New design:**
- **URL `q` param** → active query. `SearchResultsPage` reads `q` from `useSearchParams()` and passes it to `useFileSearch`. On reload or deep link, the URL always wins.
- **`SearchBox` local state** → controls the input field value. Syncs from URL on mount (existing behavior at line 20–26). On submit, pushes to URL via `router.push()`.
- **Zustand store** → owns only `previousQueries` (search history) and `searchCount`/`lastSearchTime` for analytics. The `query` field is removed from the persisted store, or kept as write-only for history tracking (not read by `SearchResultsPage`).

This ensures deep links, reloads, browser back/forward, and shared URLs all produce the correct results.

The `tab` parameter controls which tab is active (signed-in users only). If omitted, defaults to My Networks. Anonymous users do not use the `tab` parameter — any stale `?tab=` value is removed from the URL on sign-out.

#### Tab Validation and Auth Transitions

Anonymous users have no tabs (results shown directly). Signed-in users have three tabs (`my-networks`, `public`, `private`). The `tab` URL parameter must be validated against the user's current auth state. Rules:

**Invalid tab in URL:**

| Scenario | Behavior |
|----------|----------|
| Anonymous visits `?tab=private` or `?tab=my-networks` | Ignore invalid tab, remove `tab` param from URL |
| Signed-in user visits `?tab=networks` | Treat as `public` (same underlying data, just the signed-in label) |
| Any user visits `?tab=unknown-value` | Ignore, fall back to auth-appropriate default |

**Auth state changes mid-session:**

| Scenario | Behavior |
|----------|----------|
| User signs in while viewing results | Layout switches from "Results (N)" to 3 tabs. Active tab defaults to `my-networks`. Re-fire the 3 additional API calls (2 for My Networks, 1 for Private). |
| User signs out while on `my-networks` or `private` tab | Layout switches from 3 tabs to "Results (N)". Discard My Networks and Private results. `tab` param removed from URL. |
| User signs out while on `public` tab | Layout switches from 3 tabs to "Results (N)" (same data, no tab). `tab` param removed from URL. |

The `SearchResultsPage` component should derive the valid tab set from auth state on each render and validate the URL `tab` parameter accordingly. Invalid tabs are silently corrected — no error state is shown.

---

## 5. Data Flow

### 5.1 Search Submission Flow

```
User types query in SearchBox
  -> router.push('/search?q=...') (URL is the source of truth)
  -> addToHistory(query) updates search store history only
  -> SearchResultsPage reads query from URL via useSearchParams()
  -> useFileSearch hook fires API calls in parallel:
     - Always: searchFiles(PUBLIC) with size=500
     - If authenticated: searchFiles(PRIVATE) with size=500
     - If authenticated: searchFiles(PUBLIC, accountName=me) with size=3000
     - If authenticated: searchFiles(PRIVATE, accountName=me) with size=3000
  -> Results mapped from FileListItem to FileItemBase
  -> My Networks tab: merge both accountName results, sort by modificationTime
  -> Public/Private tabs: use direct results in Solr relevance order
  -> Client-side filters applied (edge count)
  -> Filtered results split into folders vs networks
  -> FoldersList renders folders/folder-shortcuts (virtualized)
  -> NetworksList renders networks/network-shortcuts (virtualized)
```

### 5.2 Tab Switching

Switching tabs does not trigger new API calls. All API calls fire in parallel on search submit. Tab switching only changes which result set is rendered:

- **My Networks**: Merges the two `accountName`-scoped result sets, sorted by `modificationTime` descending. Each item shows a visibility badge (visibility column shown).
- **Public**: Renders public results in Solr relevance order (server return order). Infinite scroll loads additional pages (500 per page). Visibility column hidden (all items are public).
- **Private**: Renders private results in Solr relevance order (server return order). Infinite scroll loads additional pages (500 per page). Visibility column shown (items may be private or unlisted).

### 5.3 Filter Application

Filters are applied client-side to the already-loaded results:

```
Raw results from API (FileItemBase[])
  -> Apply edge count filter (min/max)
  -> Split into folders vs networks
  -> Render in respective panes
```

---

## 6. Component Specification

### 6.1 Component Hierarchy

```
src/app/search/
  page.tsx                          # 'use client', renders SearchResultsPage
  loading.tsx                       # Skeleton for two-pane layout
  error.tsx                         # Error boundary (existing)
  _components/
    SearchResultsPage.tsx           # Main orchestrator: tabs, header, content
    SearchEmptyState.tsx            # Initial state + no results state
    SearchFilters.tsx               # Filter bar (edge count filter)
```

### 6.2 Reused Components (no modifications needed)

| Component | Source | Usage |
|-----------|--------|-------|
| `ItemIcon` | `src/components/ui/ItemIcon.tsx` | Type/status icons in result rows |
| `DetailsPanel` | `src/components/shared/DetailsPanel.tsx` | Item details side panel |
| `useResizablePanel` | `src/hooks/useResizablePanel.ts` | Details panel width management |
| `table-styles` | `src/components/shared/table-styles.ts` | Row/grid styling |
| `table-utils` | `src/components/shared/table-utils.ts` | `formatDate`, `formatCount` |
| `SearchBox` | `src/components/SearchBox.tsx` | NavBar search input (modified in Phase 4 for history dropdown — see Section 11 Modified Files) |
| `NetworkStatusDialog` | `src/components/dialogs/NetworkStatusDialog.tsx` | Warning/error display |
| `ShareDialog` | `src/components/dialogs/ShareDialog.tsx` | Sharing management |
| `Tabs` | `src/components/ui/tabs.tsx` | Tab switching (My Networks / Public / Private) |

### 6.3 Components Needing Adaptation

#### Coupling Analysis

The components below reference `MyAccountTabType` to varying degrees. This section documents the exact coupling points and the adaptation strategy for each.

| Component | Source | Adaptation needed |
|-----------|--------|-------------------|
| `FoldersList` | `src/components/shared/FoldersList.tsx` | **Low-moderate coupling.** Changes needed: (1) Add virtualization using `@tanstack/react-virtual`. (2) **Internal sorting**: The component owns its own sort state (`useState` for sortField/sortDirection, lines 389–392) and renders clickable column headers. On Public/Private search tabs where sort must be fixed to relevance (server order), these sort controls need to be suppressible. **Strategy**: add a `sortable?: boolean` prop (default `true`). When `false`, hide sort icons and disable column-header click handlers. The parent passes pre-sorted data and the component renders it as-is. (3) **Navigation**: `handleFolderDoubleClick` (line 394) always navigates via `router.push('/folders/${id}')` into the My Account folder view. This is intentional for search — the doc specifies folder clicks navigate into the folder (Section 3.4). The `tabState === TRASH` guard (line 400) is the only `MyAccountTabType` usage; the prop is optional and works without it. |
| `NetworksList` | `src/components/shared/NetworksList.tsx` | **Low-moderate coupling.** Changes needed: (1) Add virtualization using `@tanstack/react-virtual`. (2) Add Edge count as a sortable column header (for My Networks tab). (3) **Internal sorting**: Same issue as `FoldersList` — owns sort state internally (lines 495–498). Needs the same `sortable?: boolean` prop to suppress sort controls on Public/Private tabs. (4) **Navigation**: `handleNetworkDoubleClick` (line 513) opens the network viewer. This works correctly for search — it resolves shortcuts and opens the target network. The `tabState === TRASH` guard (line 550) is the only `MyAccountTabType` usage; the prop is optional and works without it. |
| `FileRenderer` | `src/app/my-account/_components/FileRenderer.tsx` | Currently coupled to `MyAccountTabType`. Either add a `SEARCH` tab type, or create a lightweight search-specific wrapper that directly calls `FoldersList` + `NetworksList`. |
| `SelectionToolbarAndFilters` | `src/app/my-account/_components/SelectionToolbarAndFilters.tsx` | **Moderate coupling — needs filter extraction.** The `tabState` prop controls 4 behaviors: (1) `TRASH` → shows restore/permanent-delete instead of normal bulk actions (line 532), (2) `SHARED` → hides bulk read-only toggle (line 598), (3) **`MYNETWORKS` → the filter UI only renders for this tab** (line 647), (4) `TRASH` → shows "deleted after 30 days" banner (line 1075). The critical issue for search is item 3: filter UI is gatekept behind `MYNETWORKS`, but search needs filters on all file tabs. **Strategy**: extract the filter UI (~lines 647–1072) into a standalone `SearchFilters` component that both pages can use (Phase 3). For Phase 2, adding `SEARCH` to `MyAccountTabType` lets the selection toolbar's bulk actions (share, download, move, delete) work immediately — `SEARCH` won't match `TRASH` or `SHARED`, so it falls through to the normal action set. |
| `ActionDropdown` | `src/app/my-account/_components/ActionDropdown.tsx` | **Moderate coupling — needs refactor from tab-based to permission-based conditionals.** Currently uses `tabState` as a proxy for permissions in 5 places: (1) `SHARED` → hides "Request DOI" (line 172), (2) `SHARED` + no WRITE → disables "Edit Properties" (line 179), (3) `SHARED` + not owner → hides "Move to Trash" (line 184), (4) `TRASH` → shows restore/delete-permanently instead of normal menu (line 382), (5) `SHARED` → hides read-only toggle (line 592). The design doc specifies permission-based actions for search (Section 9.2), but the current code has no permission-based code path. **Strategy (Phase 2)**: refactor these 5 conditionals to check `item.permission` and `isOwner` directly instead of `tabState`. For example, "hide Move to Trash if not owner" should check `!isOwner` rather than `tabState === SHARED && !isOwner`. This refactor benefits both search and My Account (the SHARED tab checks are already doing permission checks — they just also check the tab unnecessarily). |
| `MyAccountTabType` | `src/types/ui/myAccount.ts` | Add `SEARCH = 'SEARCH'` value. |

### 6.4 New Components to Build

| Component | Purpose |
|-----------|---------|
| `useFileSearch` hook | SWR-based hook wrapping `files.searchFiles`. Fires 4 parallel file search calls for signed-in users (2 for My Networks with `accountName`, 1 Public, 1 Private). Returns per-tab results, loading states, counts, and pagination for Public/Private infinite scroll. |
| `SearchResultsPage` | Main page orchestrator. Manages three tabs (My Networks, Public, Private & Unlisted), header (relevance badge on fixed-sort tabs, view toggle, details toggle), filter bar, and content area. |
| `SearchEmptyState` | Initial search state with example queries and no-results state. |
| `SearchFilters` | Filter bar component with "All filters" dropdown and active filter chips. Extracted/inspired by the filter portion of `SelectionToolbarAndFilters`. |

---

## 7. Filter System

### 7.1 Phase 1: Edge Count Filter

A single client-side filter matching the existing My Account filter pattern:

- **"All filters" button** with `SlidersHorizontal` icon opens a dropdown panel
- **Edge Count checkbox** toggles the filter on/off
- When enabled, shows **Min/Max number inputs** inline
- Results with edge count outside the range are hidden
- **Active filter chip** appears in the filter bar: `[Edge: 200-400 x]`
- Clicking `x` on the chip removes the filter

#### Filter State
```typescript
interface SearchFilterState {
  edgeCount: { min: string; max: string };
}
```

#### Filter Logic
Applied client-side after results are loaded:
```
if filter enabled AND item.edges is defined:
  show item only if edges >= min AND edges <= max
```

Networks without an `edges` value are shown regardless of filter (they cannot be evaluated).

### 7.2 Shared Across File Tabs

Filter state is shared across the three file tabs (My Networks, Public, Private & Unlisted). Setting "Edge: 200-400" on any file tab persists when switching to another. Rationale: the user is filtering by network characteristics, which don't depend on visibility or index scope.

### 7.3 Future Filter Phases

Planned for future implementation:
- **Node count**: Min/max range (pending `FileListItem` field availability)
- **Modification date**: From/To date pickers
- **Creation date**: From/To date pickers
- **Owner**: Text input with autocomplete (server-side via `accountName` param)

---

## 8. Search History & Autocomplete

### 8.1 Search History Storage

The existing `useSearchStore` already persists `previousQueries` (up to 10) in localStorage via Zustand `persist` middleware. No changes needed to the storage layer.

### 8.2 History Dropdown

When the user focuses the `SearchBox` input:
- A dropdown appears below the input showing previous queries
- Each entry shows the query text with a clock icon
- Clicking an entry populates the input and submits the search
- The dropdown closes when the input loses focus or a search is submitted

### 8.3 Autocomplete from History

As the user types, the history dropdown filters to show only matching previous queries:
- Matching is case-insensitive prefix/substring match
- Matched portion is highlighted in the dropdown
- Arrow keys navigate suggestions, Enter selects the highlighted suggestion
- This is **local-only autocomplete** from history — no API calls are made during typing
- The API search is only fired on explicit submit (Enter key or search button click)

---

## 9. Permissions & Actions

### 9.1 Selection Toolbar

The selection toolbar (bulk actions) is available based on permissions, not tab:

- **Anonymous users**: No selection toolbar. All results are read-only.
- **Signed-in users (file tabs)**: Selection toolbar is available on My Networks, Public, and Private & Unlisted tabs. Actions within the toolbar are gated by the user's permission on each selected item.

This enables workflows like: "Search for all my private networks about X, select them, and flip them to public."

### 9.2 Action Permissions

Actions available per item depend on the user's authentication state and ownership:

| Context | Available Actions (hamburger menu) |
|---------|-----------------------------------|
| Anonymous | Open in Cytoscape Desktop, Download |
| Signed-in, not owner | Open in Cytoscape Desktop, Download, Edit Properties (disabled if no WRITE permission), Make a Copy, Share, Move, Add Shortcut |
| Signed-in, owner | All above + Request DOI, Set/Remove Read-only, Move to Trash |

#### Implementation: ActionDropdown (Completed)

`ActionDropdown` uses ownership-based conditionals (`isOwner`) and auth state (`isSignedIn`) to determine which menu items are shown. This replaces the original tab-based approach (`tabState === SHARED`) that was used as a proxy for permissions. The refactored logic:

| Condition | Menu item behavior |
|-----------|-------------------|
| `isOwner` | Show Request DOI, Set Read-only, Move to Trash |
| `!isOwner && !hasWritePermission` | Disable Edit Properties |
| `!isOwner` | Hide Move to Trash |
| `!isSignedIn` | Hide all auth-requiring actions (Edit Properties, Make a Copy, Share, Move, Add Shortcut, Rename); show only Open in Cytoscape Desktop and Download |
| `tabState === TRASH` | Show restore/delete-permanently (unchanged — trash only exists in My Account) |
| Folder items + `!isSignedIn` | No menu shown (folders have no anonymous-available actions) |

`SearchResultsPage` wraps its content with `DialogProvider` and renders `ActionDropdown` with `tabState={MyAccountTabType.SEARCH}`. The `SEARCH` value does not match `TRASH` or `SHARED`, so the component falls through to the normal permission-based menu.

### 9.3 Bulk Actions

When multiple items are selected, the selection toolbar shows actions applicable to all selected items. If the selection contains items with mixed permission levels, only the actions common to all selected items are available (determined by the lowest `item.permission` in the selection).

Key bulk action use case: Select multiple owned private networks and change their visibility to public.

---

## 10. Implementation Plan

### Phase 1: Core Search (Foundation)
1. **Make URL the single source of truth for search query**: Refactor `SearchResultsPage` to read `q` and `tab` from `useSearchParams()` instead of the Zustand store. Refactor `SearchBox` to only push to URL on submit (existing) and stop writing `query` to the store. Update `search-store` to stop persisting `query` — keep only `previousQueries` for history. See Section 4.5 for details.
2. Add virtualization (`@tanstack/react-virtual`) to `NetworksList` and `FoldersList` components
3. Add `SEARCH` to `MyAccountTabType`
4. Create `useFileSearch` hook wrapping `files.searchFiles` with SWR — 4 parallel calls for signed-in users (2 for My Networks with `accountName` + size=3000, 1 Public + 1 Private with size=500)
5. Create `SearchResultsPage` with three tabs (My Networks, Public, Private & Unlisted)
6. Wire up `FoldersList` + `NetworksList` in the content area for file tabs
7. Implement My Networks tab: merge both `accountName`-scoped results, sort by modification date
8. Implement Public/Private tabs with infinite scroll pagination
9. Create `SearchEmptyState` component
10. Default signed-in users to My Networks tab; anonymous users see results directly (no tabs)
11. Update `loading.tsx` skeleton

### Phase 2: Toolbar & Actions
1. Integrate `SelectionToolbarAndFilters` for signed-in users (bulk actions only — filters come in Phase 3). The `SEARCH` value added to `MyAccountTabType` in Phase 1 lets this work immediately since `SEARCH` won't match `TRASH` or `SHARED` guards
2. Refactor `ActionDropdown` from tab-based to permission-based conditionals: replace the 5 `tabState === SHARED` / `tabState === TRASH` checks with direct `isOwner` and `item.permission` checks (see Section 6.3 for details). This benefits both search and My Account
3. Integrate `ActionDropdown` for item-level actions with permission-gated availability per Section 9.2
4. Integrate `DetailsPanel`

### Phase 3: Filters
1. Extract filter UI (~lines 647–1072 of `SelectionToolbarAndFilters`) into a standalone `SearchFilters` component. The `FilterState` interface and `onFiltersChange` callback pattern are already clean and can be lifted out directly
2. Use `SearchFilters` in the search page for all three file tabs (My Networks, Public, Private & Unlisted)
3. Update `SelectionToolbarAndFilters` in My Account to use the extracted `SearchFilters` component internally (keeps existing behavior, eliminates duplication)
4. Implement edge count filter (client-side)
5. Active filter chips with removal

### Phase 4: Search History & NavBar Enhancements
1. Search history dropdown in `SearchBox`
2. Autocomplete from history while typing
3. Keyboard shortcut (`/` or `Cmd+K`) to focus search input

### Phase 5: Polish
1. Grid view support
2. Responsive/mobile considerations
3. Accessibility audit

---

## 11. Files Reference

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/use-file-search.ts` | SWR hook for `files.searchFiles` v3 API |
| `src/app/search/_components/SearchResultsPage.tsx` | Main search page orchestrator |
| `src/app/search/_components/SearchEmptyState.tsx` | Initial and no-results states |
| `src/app/search/_components/SearchFilters.tsx` | Filter bar with edge count filter |

### Modified Files

| File | Change |
|------|--------|
| `src/components/shared/FoldersList.tsx` | Add virtualization using `@tanstack/react-virtual`; add `sortable` prop to suppress internal sort controls on fixed-relevance tabs |
| `src/components/shared/NetworksList.tsx` | Add virtualization using `@tanstack/react-virtual`; add Edge count as a sortable column header; add `sortable` prop (same as FoldersList) |
| `src/app/search/page.tsx` | Replace `TabsPanel` with `SearchResultsPage` |
| `src/app/search/loading.tsx` | Update skeleton to match new layout |
| `src/types/ui/myAccount.ts` | Add `SEARCH` to `MyAccountTabType` |
| `src/stores/search-store.tsx` | Remove `query` from persisted state (URL is now the source of truth); keep `previousQueries` for history; add filter state fields |
| `src/types/stores/search-store.ts` | Update types to reflect URL-first query design; add filter state types |
| `src/components/SearchBox.tsx` | Add history dropdown and autocomplete |
| `src/app/my-account/_components/ActionDropdown.tsx` | Refactor 5 tab-based conditionals (`tabState === SHARED`/`TRASH`) to use permission-based checks (`isOwner`, `item.permission`) directly. Enables search reuse and simplifies My Account logic (Phase 2) |
| `src/app/my-account/_components/SelectionToolbarAndFilters.tsx` | Extract filter UI (~lines 647–1072) into standalone `SearchFilters` component; update to use extracted component internally (Phase 3) |

### Reused Files (no changes)

| File | Reused For |
|------|------------|
| `src/components/shared/DetailsPanel.tsx` | Item details panel |
| `src/components/shared/table-styles.ts` | Row/grid styling |
| `src/components/shared/table-utils.ts` | Date/count formatting |
| `src/components/ui/ItemIcon.tsx` | File type icons |
| `src/components/ui/tabs.tsx` | Tab component |
| `src/hooks/useResizablePanel.ts` | Details panel resizing |
| `src/lib/api/ndex-client-manager.ts` | NDEx client factory |
| `src/lib/contexts/KeycloakContext.tsx` | Authentication state |
| `src/lib/contexts/ConfigContext.tsx` | App configuration |
| `src/components/dialogs/ShareDialog.tsx` | Share dialog |
| `src/components/dialogs/NetworkStatusDialog.tsx` | Status display |

### Existing Files to Deprecate

| File | Reason |
|------|--------|
| `src/app/search/_components/TabsPanel.tsx` | Replaced by `SearchResultsPage` |
| `src/app/search/_components/NetworkTable.tsx` | Replaced by `NetworksList` |
| `src/hooks/use-network-search.ts` | Uses old v2 API, replaced by `useFileSearch` |

---

## 12. Performance Considerations

### Assessment

Given that ~98% of users have fewer than 1,000 networks in their account and users are assumed to be on fast internet connections, the performance risks in this design are **low**. Here is a brief analysis:

| Concern | Typical case (98% of users) | Worst case (~2% power users) | Verdict |
|---------|---------------------------|------------------------------|---------|
| My Networks merge + sort | <2,000 items total (trivial) | Up to 6,000 items | Negligible — JS sorts 6,000 objects in <5ms |
| JSON payload size (My Networks) | ~500 KB (1,000 items × ~500 bytes) | ~3 MB | Fine on fast internet |
| Client-side filter/split | Iterates <2,000 items | Iterates 6,000 items | Negligible |
| Public/Private infinite scroll accumulation | Users rarely scroll past page 2-3 | 10,000+ items after many pages | Virtualization keeps DOM small; JS array growth is fine |
| 4 parallel API calls | HTTP/2 multiplexing handles this | Same | Not a concern |

### Best Practices to Follow During Implementation

- **Memoize derived data**: The merge, sort, filter, and split operations should use `useMemo` with correct dependency arrays so they don't recompute on unrelated re-renders (e.g., selection changes, details panel toggle).
- **Lazy tab rendering**: Only compute derived data (merge/sort/filter/split) for the active tab. Inactive tabs should not re-derive their data on every render cycle.

---

## 13. Error Handling

The search feature fires up to 4 parallel API calls, any of which can fail independently. This section specifies how failures surface to the user, following patterns already established in the codebase (`PeopleWithAccessSection` inline error pattern, SWR retry conventions, toast system for user-initiated actions).

### 13.1 Design Principles

- **Partial failures are not full-page errors.** If one API call fails, the other tabs' results are still valid and should be shown.
- **Search errors are displayed inline, not as toasts.** Toasts are reserved for user-initiated actions (copy, move, share) that are fire-and-forget. Search results are persistent UI that the user is actively looking at — inline errors are more appropriate and discoverable.
- **SWR handles transient failures automatically.** Most transient errors (brief network hiccups, 503s) self-heal via SWR retry before the user notices.

### 13.2 SWR Retry Configuration

The `useFileSearch` hook should use consistent SWR error handling settings, matching existing hooks in the codebase:

```typescript
{
  shouldRetryOnError: true,
  errorRetryCount: 3,
  revalidateOnReconnect: true,
  revalidateOnFocus: true,
}
```

### 13.3 Failure Scenarios

#### Partial Failure (one or more calls fail, others succeed)

Each of the 4 API calls maps to a specific tab (or contributes to one). When a call fails:

| Failed call | Affected tab | Other tabs |
| --- | --- | --- |
| `searchFiles(PUBLIC, accountName=me)` | My Networks (shows partial results from private call + inline warning) | Public, Private unaffected |
| `searchFiles(PRIVATE, accountName=me)` | My Networks (shows partial results from public call + inline warning) | Public, Private unaffected |
| Both `accountName` calls | My Networks (shows inline error with retry) | Public, Private unaffected |
| `searchFiles(PUBLIC)` | Public (shows inline error with retry) | My Networks, Private unaffected |
| `searchFiles(PRIVATE)` | Private (shows inline error with retry) | My Networks, Public unaffected |

**My Networks partial failure** is unique because the tab merges two calls. If only one of the two `accountName`-scoped calls fails:

- Display the results from the successful call.
- Show an inline warning above the results: "Some results may be missing — unable to load [public/private] networks. [Retry]"
- The tab count reflects only the successful call's `numFound` with a `~` prefix (e.g., "My Networks (~2,100)") to signal the count is incomplete.
- If the user clicks Retry, only the failed call is re-fired.

**Combined truncation + partial failure on My Networks**: When one call fails and the other call's results are truncated (loaded items < `numFound`), both states are active simultaneously. The rules compose as follows:

- **Tab header**: `~` prefix wins over `+` suffix. Show `~N` using the successful call's `numFound` only — e.g., "My Networks (~3,200)". Rationale: the `~` already signals the count is incomplete; adding `+` would be redundant and confusing.
- **Inline messages**: Both messages appear, stacked vertically. The partial-failure warning appears first: "Some results may be missing — unable to load [public/private] networks. [Retry]". The truncation message appears below it: "Showing 3,000 of 3,200 loaded results — refine your search to see all matches."
- **Filter bar info icon**: Shown (since the successful side is truncated), with its standard tooltip about filters/sorting applying only to loaded results.
- When the failed call is retried and succeeds, the `~` prefix is removed and normal truncation rules take over (switching to `N+` if either side is still truncated, or exact `N` if both sides fit).

#### Tab Header on Error

When a tab's API call(s) have fully failed (no data at all), the tab header shows the tab name without a count:

- Normal: `Public (2,341)`
- Error: `Public`

This avoids showing stale counts from a previous query or a misleading `(0)`.

#### Per-Tab Inline Error Component

Each tab renders an inline error state when its data fails to load. This follows the `PeopleWithAccessSection` error pattern (`src/components/dialogs/PeopleWithAccessSection.tsx` lines 31–45):

```
+-------------------------------------------------------------------+
|  ⚠  Unable to load [public networks / private networks / users].  |
|     [Retry]                                                        |
+-------------------------------------------------------------------+
```

- Icon: `AlertCircle` (matching existing pattern)
- Styling: light red/amber border, consistent with `PeopleWithAccessSection`
- Retry button: re-triggers the specific failed SWR call(s) via `mutate()`
- Appears in place of the results list (folders + networks panes)

#### Full Failure (all calls fail)

If every API call fails (likely a network outage or server down), `SearchResultsPage` detects that all tabs have errored with no usable data and throws an error to propagate to the existing `error.tsx` boundary (`src/app/search/error.tsx`). The `useFileSearch` hook follows the standard codebase convention of returning error states — it never throws. The decision to escalate to the error boundary lives in the page component. This boundary already provides:

- Context-specific message listing common causes (service unavailability, connectivity, invalid parameters, server overload)
- Retry button
- Navigate-to-home button

**Trigger condition**: `SearchResultsPage` checks whether all file search calls have errored, with no cached data from a previous successful fetch. If any tab has data (even stale), the per-tab inline errors are shown instead and the page does not throw.

#### Default Tab on Partial Failure

If the default tab's data fails to load (My Networks for signed-in, or the single result set for anonymous), the page still renders showing the inline error. For signed-in users, they can switch to a working tab. No automatic tab switching occurs — it would be confusing if the page silently lands on a non-default tab.

### 13.4 Loading States During Retry

When the user clicks Retry on a per-tab inline error:
- The inline error is replaced by the standard loading skeleton for that tab
- Other tabs remain interactive — retry does not block the whole page
- If the retry also fails, the inline error re-appears (SWR's built-in retry has already exhausted its 3 automatic retries before the inline error was shown, so the manual retry is a fresh attempt)

### 13.5 Error Handling Summary by Phase

| Phase | Error handling work |
| --- | --- |
| Phase 1 | `useFileSearch` hook returns per-call error states; per-tab inline error with retry; tab header hides count on error; full-failure falls through to `error.tsx`; My Networks partial failure warning |
| Phase 2 | Bulk action errors use toast notifications (consistent with existing `use-network-copy`, `use-file-move-operation` patterns) |
| Phase 3 | No additional error handling — filters are client-side |
| Phase 4 | Search history is local (localStorage) — no error states needed |

