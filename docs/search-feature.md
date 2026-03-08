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
13. [Known Code Consistency Observations](#known-code-consistency-observations)

---

## 1. Overview

### Purpose
A Google Drive-inspired search feature for the NDEx3 web application that allows users to search for networks, folders, and shortcuts across NDEx. The search uses the v3 `files.searchFiles` API and presents results in the same two-pane layout as the My Account page (folders on top, networks on bottom) for UI consistency and component reuse.

### Key Design Decisions
- **Four-tab design** (My Networks, Public, Private, Users) for signed-in users
- **My Networks tab uses dedicated API calls** with `accountName` parameter for accurate server-side filtering and pagination, rather than client-side filtering of bulk results
- **Tabs (not sidebar)** to visually distinguish the search results page from the My Account page, which uses a sidebar for navigation
- **"My Networks" tab** solves the problem of a user's own networks being split across two Solr indexes by visibility — it merges results from both indexes where the user is the owner, sorted by modification date
- **Virtualized lists** using `@tanstack/react-virtual` for smooth scrolling with large result sets
- **Reuse My Account components** (`FoldersList`, `NetworksList`, `FileRenderer`, `SelectionToolbarAndFilters`, `ActionDropdown`) for UI consistency and reduced development effort
- **Permission-based actions** rather than tab-based or role-based restrictions
- **Users tab** reuses the existing `useUserSearch` hook and `UserTable` component for user discovery
- **Shared filter state across file tabs** so filter settings persist when switching between My Networks, Public, and Private tabs

---

## 2. Requirements

### 2.1 Functional Requirements

#### Search Scopes
- **Anonymous users**: Search only the public index (1 API call) plus user search (1 API call). Two tabs shown: **Networks** and Users. The "Networks" tab searches the public index only (anonymous users have no access to private content), but is labeled "Networks" rather than "Public" because the public/private distinction is not meaningful to anonymous users.
- **Signed-in users**: Five parallel API calls are made. Results displayed in four tabs: My Networks, Public, Private, and Users.

#### Default Tab
- **Anonymous users**: Networks tab by default
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
|  | [My Networks (55)] [Public (2,341)] [Private (47)] [Users (12)]  Sort  L/G  i ||
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

Horizontal tabs at the top of the content card. For signed-in users, four tabs are shown:

- **My Networks (N)** or **My Networks (N+)** — default tab. Uses two dedicated API calls with `accountName` parameter for server-side owner filtering. Merges the user's public and private results, sorted by modification date descending. Each row displays a visibility badge (Public/Private). The tab count is the sum of `numFound` from both user-scoped calls — always accurate. When either call's results are truncated (loaded items < `numFound`), the count shows a `+` suffix (e.g., "My Networks (5,533+)") and an inline message appears above the results: "Showing 4,533 of 5,533 results — refine your search to see all matches." When all results fit within the 3,000-per-call limit, the count is exact and no `+` or message is shown.
- **Public (N)** — shows `numFound` from the public `searchFiles` call. Results sorted by Solr relevance within the public index. Contains all public content across NDEx, not just the user's own.
- **Private (N)** — shows `numFound` from the private `searchFiles` call. Results sorted by Solr relevance within the private index. Contains all private content the user has access to (owned + shared).
- **Users (N)** or **Users (N+)** — shows the count of matching users. Displays matching user accounts in a table with Username, First Name, Last Name, Description, and Joined date. Username links to the user's profile page. This tab has no folder/network panes — it renders a flat user list instead. Uses the same truncation pattern as My Networks: single fetch of up to 2,000 results, tab count uses the server's `numFound`. When loaded results < `numFound`, the count shows a `+` suffix (e.g., "Users (3,500+)") and an inline message appears: "Showing 2,000 of 3,500 results — refine your search to see all matches." **Implementation note**: the existing `useUserSearch` hook needs to pass through the server's `numFound` instead of using `users.length` — see Section 6.3.

For anonymous users, two tabs are displayed: **Networks** and Users. The "Networks" tab is functionally identical to a signed-in user's "Public" tab (same API call, same layout), but labeled "Networks" because anonymous users have no concept of public vs. private visibility. When the user signs in, the tabs expand to the full four-tab set (My Networks, Public, Private, Users) — the "Networks" tab effectively becomes "Public" with the additional tabs appearing alongside it.

All API calls fire in parallel on search submit so counts are ready immediately, but only the active tab's results are rendered. For signed-in users: 5 calls (2 for My Networks + 1 Public + 1 Private + 1 Users). For anonymous users: 2 calls (1 Public + 1 Users).

#### Why Four Tabs

A signed-in user's networks are split across two Solr cores by visibility: their public networks are in the public index and their private networks are in the private index. The "My Networks" tab solves this by using the `accountName` parameter to fetch only the user's own networks from each index, then merging them client-side. This gives users a single view of all their matching content regardless of visibility.

The "Public" and "Private" tabs provide focused, relevance-ranked browsing within a single Solr core. Solr relevance scores are only meaningful within a single core, not across cores, so these tabs preserve the native Solr ranking.

"Shared with me" was considered as a file tab but dropped because the `searchFiles` API has no server-side parameter to exclude a specific owner. Implementing it would require client-side filtering of paginated results, which produces inaccurate counts and incomplete content. It may be added in a future phase if the API adds support for an `excludeAccountName` parameter.

The "Users" tab provides user discovery alongside file search, using the separate `ndexClient.user.searchUsers()` API. This tab renders a user table instead of the folder/network two-pane layout.

#### API Calls per Tab

For signed-in users, 5 API calls are made in parallel on each search:

| API Call | Visibility | accountName | Page size | Serves tab |
|----------|-----------|-------------|-----------|------------|
| `searchFiles(PUBLIC, accountName=me)` | PUBLIC | Current user | 3,000 | My Networks |
| `searchFiles(PRIVATE, accountName=me)` | PRIVATE | Current user | 3,000 | My Networks |
| `searchFiles(PUBLIC)` | PUBLIC | — | 500 | Public |
| `searchFiles(PRIVATE)` | PRIVATE | — | 500 | Private |
| `searchUsers(query)` | — | — | 2,000 | Users |

For anonymous users, 2 API calls are made:

| API Call | Visibility | Page size | Serves |
|----------|-----------|-----------|--------|
| `searchFiles(PUBLIC)` | PUBLIC | 500 | Networks (labeled "Networks" for anonymous) |
| `searchUsers(query)` | — | 2,000 | Users |

The My Networks calls use `accountName` for server-side filtering, so `numFound` is always accurate (it reflects the true total in each index). This tab does not paginate — it makes a single fetch of up to 3,000 items per call and stops. The large fetch size means most users' entire result set is returned in one call (~98% of users have fewer than 3,000 matching results per index). When either call returns fewer items than its `numFound` (i.e., results are truncated at the 3,000 limit), two things happen:

1. **Tab header**: The count shows a `+` suffix — e.g., "My Networks (5,533+)" where 5,533 = `publicNumFound + privateNumFound`. The `+` signals that not all matching results are displayed.
2. **Inline message**: A message appears above the results list: "Showing 4,533 of 5,533 results — refine your search to see all matches." (where 4,533 = actual loaded items from both calls).
3. **Info icon on filter bar**: When truncation is active, an info icon (ℹ) appears next to the filter controls with a tooltip: "Filters, sorting, and actions apply only to the loaded results, not the full match count." This is only shown when results are truncated — in the common case (no truncation), the icon is hidden.

**Truncated results contract**: When the My Networks or Users tab is truncated, all client-side operations — filtering, sorting, selection, and bulk actions — operate exclusively on the loaded subset. They do not apply to the items beyond the fetch limit. This means:
- A filter that hides 500 items from the loaded 4,533 shows 4,033 results, not `numFound` minus 500.
- Sorting reorders only the loaded items.
- "Select all" selects only loaded items. Bulk actions (e.g., change visibility) apply only to the selection.
- The tab header count (`N+`) always reflects the server's `numFound` sum, regardless of client-side filters. The inline message updates to reflect filtered counts: "Showing 4,033 of 5,533 results (filtered from 4,533 loaded)."

When all results fit within the 3,000-per-call limit (the common case for ~98% of users), the count is exact and none of the truncation indicators (the `+` suffix, inline message, or filter info icon) are shown.

The Public and Private calls use a page size of 500 with infinite scroll for additional pages, since these tabs can return tens of thousands of results.

The Users tab uses the same truncation pattern as My Networks: single fetch of up to 2,000 results with the server's `numFound` for the tab count. When results are truncated (loaded < `numFound`), the same `+` suffix, inline message, and filter info icon are shown. **Implementation note**: the current `useUserSearch` hook fabricates `numFound` as `users.length` — it must be updated to pass through the server's actual `numFound` (see Section 6.3).

#### Tab Data Summary

| Tab | Data source | Sort | Pagination |
|-----|-------------|------|------------|
| My Networks | 2 dedicated API calls with `accountName=me`, merged | Column-header sorting: Last modified (default desc), Name, Edge count | Single fetch, no pagination (3,000 cap per call; truncated results show `+` count and inline message) |
| Public | 1 API call, all public results | Fixed: Relevance (server order) | Infinite scroll (500 per page) |
| Private | 1 API call, all private results | Fixed: Relevance (server order) | Infinite scroll (500 per page) |
| Users | 1 `searchUsers` API call | Fixed: Relevance (server order) | Single fetch, no pagination (2,000 cap; same truncation pattern as My Networks) |

Only the My Networks tab supports user-controlled sorting, via clickable column headers in `FoldersList` and `NetworksList` (no dropdown). Public, Private, and Users tabs use fixed server-order relevance with a static badge — see Section 3.3 for the rationale.

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
| My Networks | **Column-header sorting.** Users click Name, Edge count, or Last modified column headers to sort (asc/desc toggle). Default: Last modified descending. | All results are loaded in a single fetch (up to 3,000 per call), so client-side sorting of the full result set works correctly. |
| Public | **Fixed: Relevance (server order).** A static green badge `Sorted by relevance` is shown in the header bar. No sort controls. | Uses infinite scroll pagination (500 per page). Client-side sorting would only reorder the currently loaded pages, not the full result set — producing misleading results. |
| Private | **Fixed: Relevance (server order).** Same as Public. | Same pagination concern as Public. |
| Users | **Fixed: Relevance (server order).** Same badge, no sort controls. | Keeps UI consistent with Public/Private tabs. Although all results are loaded (single page), adding sort UI for a tab that may be refactored later (see Section 13) is unnecessary complexity. |

The `FoldersList` and `NetworksList` components already support clickable column headers with sort toggle (asc/desc/none) for Name and Last Modified. However, both components own their sort state internally (`useState`), which means the sort controls always render. For search, a new `sortable` prop is needed (see Section 6.3): on the My Networks tab, `sortable={true}` enables column-header sorting (with Edge count added to `NetworksList`); on Public and Private tabs, `sortable={false}` suppresses sort icons and click handlers so the server-order relevance is preserved.

See `docs/search-feature-ui-mock.svg` for the visual mockup of the relevance badge and tab layouts.

### 3.4 Content Area

#### File Tabs (My Networks, Public, Private)

Two-pane layout reusing `FileRenderer` pattern:

- **Top pane**: `FoldersList` — shows folders and folder-type shortcuts matching the search
- **Bottom pane**: `NetworksList` — shows networks and network-type shortcuts matching the search

Both components are configured with:
- `showOwnerColumn={true}` — always show owner (users are discovering content across NDEx)
- `showVisibilityColumn={true}` — show visibility badges
- Selection support enabled for signed-in users

Clicking a folder navigates into it (same behavior as My Account and Google Drive). The folder's contents may or may not relate to the original search query — this is expected and consistent with Google Drive's behavior.

#### Users Tab

The Users tab replaces the two-pane layout with a single `UserTable` component that displays matching user accounts. The table columns are: Username (linked to profile), First Name, Last Name, Description, and Joined date. This builds on the existing `UserTable` component and `useUserSearch` hook, both of which need minor modifications (see Section 6.3).

Filters (edge count, etc.) do not apply to the Users tab and the filter bar is hidden when this tab is active.

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
interface SearchResult<T> {
  ResultList: T[];    // Array of FileListItem objects
  start: number;      // Starting index
  numFound: number;   // Total matches in the index
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
  ownerUUID: item.ownerUUID,
  visibility: item.visibility,
  edges: item.edges,
  permission: item.permission,
  attributes: { ...item.attributes }
}
```

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

// Sort options (My Networks tab only — Public/Private/Users use fixed server-order relevance)
type MyNetworksSortField = 'name' | 'modificationTime' | 'edgeCount';
type SortDirection = 'asc' | 'desc';
```

Filter state is shared across all three tabs — changing a filter applies to all.

#### SWR for Server State
Each unique combination of `(query, visibility, accountName, pageIndex)` produces a unique SWR cache key. For signed-in users, five independent SWR hooks run in parallel (2 for My Networks with `accountName`, 1 for Public, 1 for Private, 1 for Users). The Users tab reuses the existing `useUserSearch` hook which already has SWR caching.

### 4.5 URL Parameters

Search state is reflected in URL parameters for deep-linking and bookmarking:

```
/search?q=cancer                  # Basic search (defaults to My Networks for signed-in, Networks for anonymous)
/search?q=cancer&tab=my-networks  # My Networks tab
/search?q=cancer&tab=public       # Public tab
/search?q=cancer&tab=private      # Private tab
/search?q=cancer&tab=users        # Users tab
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

The `tab` parameter controls which tab is active. If omitted, defaults to My Networks (signed-in) or Networks (anonymous).

#### Tab Validation and Auth Transitions

Anonymous users have two tabs (`networks`, `users`). Signed-in users have four tabs (`my-networks`, `public`, `private`, `users`). The `tab` URL parameter must be validated against the user's current auth state. Rules:

**Invalid tab in URL:**

| Scenario | Behavior |
|----------|----------|
| Anonymous visits `?tab=private` or `?tab=my-networks` | Ignore invalid tab, fall back to `networks` (anonymous default) |
| Signed-in user visits `?tab=networks` | Treat as `public` (same underlying data, just the signed-in label) |
| Any user visits `?tab=unknown-value` | Ignore, fall back to auth-appropriate default |

**Auth state changes mid-session:**

| Scenario | Behavior |
|----------|----------|
| User signs in while on `networks` tab | Tab set expands to 4 tabs. Active tab becomes `public` (same data, new label). Re-fire the 3 additional API calls (2 for My Networks, 1 for Private). URL updated to `?tab=public`. |
| User signs in while on `users` tab | Tab set expands to 4 tabs. Active tab stays `users`. Re-fire the 3 additional API calls. |
| User signs out while on `my-networks` or `private` tab | Tab set contracts to 2 tabs. Active tab falls back to `networks` (anonymous default). Discard My Networks and Private results. URL updated to `?tab=networks`. |
| User signs out while on `public` tab | Active tab becomes `networks` (same data, anonymous label). URL updated to `?tab=networks`. |
| User signs out while on `users` tab | Tab set contracts to 2 tabs. Active tab stays `users`. |

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
     - Always: searchUsers(query) with size=2000
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

- **My Networks**: Merges the two `accountName`-scoped result sets, sorted by `modificationTime` descending. Each item shows a visibility badge.
- **Public**: Renders public results in Solr relevance order (server return order). Infinite scroll loads additional pages (500 per page).
- **Private**: Renders private results in Solr relevance order (server return order). Infinite scroll loads additional pages (500 per page).
- **Users**: Renders user search results using `UserTable`. No folder/network panes.

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
    SearchResultActions.tsx         # Read-oriented action dropdown (Public tab, anonymous)
    UserTable.tsx                   # Existing component for Users tab (minor changes needed — see Section 6.3)
```

### 6.2 Reused Components (no modifications needed)

| Component | Source | Usage |
|-----------|--------|-------|
| `ItemIcon` | `src/components/ui/ItemIcon.tsx` | Type/status icons in result rows |
| `DetailsPanel` | `src/components/shared/DetailsPanel.tsx` | Item details side panel |
| `useResizablePanel` | `src/hooks/useResizablePanel.ts` | Details panel width management |
| `table-styles` | `src/components/shared/table-styles.ts` | Row/grid styling |
| `table-utils` | `src/components/shared/table-utils.ts` | `formatDate`, `formatCount` |
| `SearchBox` | `src/components/SearchBox.tsx` | NavBar search input |
| `NetworkStatusDialog` | `src/components/dialogs/NetworkStatusDialog.tsx` | Warning/error display |
| `ShareDialog` | `src/components/dialogs/ShareDialog.tsx` | Sharing management |
| `Tabs` | `src/components/ui/tabs.tsx` | Tab switching (My Networks / Public / Private / Users) |

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
| `useUserSearch` | `src/hooks/use-user-search.ts` | **Needs fixes.** Currently hardcodes `start: 0, size: 2000` and sets `numFound: users.length` instead of passing through the server's actual `numFound` (line 23). This means: (1) the Users tab count caps at 2,000 even when more matches exist, (2) no pagination support. **Strategy**: update the hook to return the server's `numFound` and accept `start`/`size` parameters. For Phase 1, the 2,000-item single page is acceptable — most user searches return far fewer matches — but the fabricated count must be fixed. |
| `UserTable` | `src/app/search/_components/UserTable.tsx` | **Minor changes needed.** No sorting required (Users tab uses fixed server-order relevance). However, the component needs minor changes: (1) remove the Display Name column (redundant with First Name + Last Name), (2) remove the raw `{totalCount} Users Total` div (line 121), (3) remove the unused `hasMore`/`loadMore` button (line 120) since all results are fetched in a single page. These are small fixes, not a rewrite. See Section 13 for the broader pattern mismatch observation (future refactor to align with `FoldersList`/`NetworksList`). |
| `MyAccountTabType` | `src/types/ui/myAccount.ts` | Add `SEARCH = 'SEARCH'` value. |

### 6.4 New Components to Build

| Component | Purpose |
|-----------|---------|
| `useFileSearch` hook | SWR-based hook wrapping `files.searchFiles`. Fires 4 parallel file search calls for signed-in users (2 for My Networks with `accountName`, 1 Public, 1 Private). Returns per-tab results, loading states, counts, and pagination for Public/Private infinite scroll. User search is handled by the existing `useUserSearch` hook. |
| `SearchResultsPage` | Main page orchestrator. Manages four tabs (My Networks, Public, Private, Users), header (relevance badge on fixed-sort tabs, view toggle, details toggle), filter bar, and content area. |
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

Filter state is shared across the three file tabs (My Networks, Public, Private). Setting "Edge: 200-400" on any file tab persists when switching to another. Rationale: the user is filtering by network characteristics, which don't depend on visibility or index scope.

Filters do not apply to the Users tab. The filter bar is hidden when Users is the active tab.

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
- **Signed-in users (file tabs)**: Selection toolbar is available on My Networks, Public, and Private tabs. Actions within the toolbar are gated by the user's permission on each selected item.
- **Users tab**: No selection toolbar. User results are read-only (clickable to view profile).

This enables workflows like: "Search for all my private networks about X, select them, and flip them to public."

### 9.2 Action Permissions

Actions available per item depend on the user's permission level on that item:

| Permission | Available Actions |
|------------|-------------------|
| No account (anonymous) | Open in Viewer, Copy Link |
| READ (signed-in, not owner) | Open in Viewer, Copy Link, Save to My Account, Create Shortcut |
| WRITE (signed-in, shared with edit) | All READ actions + Edit Properties |
| ADMIN (owner) | All WRITE actions + Change Visibility, Move, Share, Delete, Download |

#### Implementation: ActionDropdown Refactor

The table above is the **target specification** for `ActionDropdown`. The current code does not implement this — it uses `tabState` (SHARED vs MYNETWORKS) and `item.owner === user.userName` as proxies for permission level. This works in My Account because each tab implies a permission context (MYNETWORKS = owner, SHARED = not owner), but breaks in search where items with different permission levels are mixed in the same tab.

The `searchFiles` API returns `item.permission` on each result (the caller's effective permission: `ADMIN`, `WRITE`, or `READ`). The refactor (Phase 2) replaces the 5 tab-based conditionals in `ActionDropdown` with `item.permission` checks:

| Current code (tab-based) | Refactored code (permission-based) |
|--------------------------|-------------------------------------|
| `tabState !== SHARED` → show Request DOI | `item.permission === ADMIN` → show Request DOI |
| `tabState === SHARED && !hasWritePermission` → disable Edit Properties | `item.permission === READ` → disable Edit Properties |
| `tabState === SHARED && !isOwner` → hide Move to Trash | `item.permission !== ADMIN` → hide Move to Trash |
| `tabState === TRASH` → show restore/delete-permanently | `tabState === TRASH` → show restore/delete-permanently (unchanged — trash is still tab-specific, only exists in My Account) |
| `tabState !== SHARED` → show read-only toggle | `item.permission === ADMIN` → show read-only toggle |

This mapping preserves existing My Account behavior (where `item.permission` already reflects the correct level) while enabling search results to show the right actions for each item regardless of which tab it appears in. See Section 6.3 for the full coupling analysis.

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
5. Create `SearchResultsPage` with four tabs (My Networks, Public, Private, Users)
6. Wire up `FoldersList` + `NetworksList` in the content area for file tabs
7. Implement My Networks tab: merge both `accountName`-scoped results, sort by modification date
8. Implement Public/Private tabs with infinite scroll pagination
9. Implement Users tab: wire `useUserSearch` hook to existing `UserTable` component
10. Create `SearchEmptyState` component
11. Default signed-in users to My Networks tab, anonymous to Networks tab
12. Update `loading.tsx` skeleton

### Phase 2: Toolbar & Actions
1. Add `SEARCH` to `MyAccountTabType` — this lets `SelectionToolbarAndFilters` work immediately for bulk actions (share, download, move, delete) since `SEARCH` won't match `TRASH` or `SHARED` guards
2. Refactor `ActionDropdown` from tab-based to permission-based conditionals: replace the 5 `tabState === SHARED` / `tabState === TRASH` checks with direct `isOwner` and `item.permission` checks (see Section 6.3 for details). This benefits both search and My Account
3. Integrate `SelectionToolbarAndFilters` for signed-in users (bulk actions only — filters come in Phase 3)
4. Integrate `ActionDropdown` for item-level actions with permission-gated availability per Section 9.2
5. Integrate `DetailsPanel`

### Phase 3: Filters
1. Extract filter UI (~lines 647–1072 of `SelectionToolbarAndFilters`) into a standalone `SearchFilters` component. The `FilterState` interface and `onFiltersChange` callback pattern are already clean and can be lifted out directly
2. Use `SearchFilters` in the search page for all three file tabs (My Networks, Public, Private)
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
| `src/hooks/use-user-search.ts` | Fix `numFound` to pass through server value instead of `users.length`; accept `start`/`size` parameters (Phase 1) |
| `src/app/search/_components/UserTable.tsx` | Remove raw `{totalCount} Users Total` div and unused `hasMore`/`loadMore` button to match search layout (Phase 1) |

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
| 5 parallel API calls | HTTP/2 multiplexing handles this | Same | Not a concern |

### One Real Concern: UserTable DOM Rendering

The `UserTable` component uses `@tanstack/react-table` and renders **all rows into the DOM** (no virtualization). With a page size of 2,000 users, this produces 12,000+ DOM nodes (2,000 rows × 6 columns), which can cause jank on lower-end devices.

**Recommendation**: When `UserTable` is refactored for visual consistency with `FoldersList`/`NetworksList` (see Section 13), add `@tanstack/react-virtual` at the same time. For Phase 1, the existing `UserTable` is acceptable — most user searches return far fewer than 2,000 matches.

### Best Practices to Follow During Implementation

- **Memoize derived data**: The merge, sort, filter, and split operations should use `useMemo` with correct dependency arrays so they don't recompute on unrelated re-renders (e.g., selection changes, details panel toggle).
- **Lazy tab rendering**: Only compute derived data (merge/sort/filter/split) for the active tab. Inactive tabs should not re-derive their data on every render cycle.

---

## 13. Known Code Consistency Observations

### UserTable vs FoldersList/NetworksList Pattern Mismatch

The existing `UserTable` component (`src/app/search/_components/UserTable.tsx`) uses `@tanstack/react-table` for rendering, which is a different approach from the `FoldersList` and `NetworksList` components that use a custom rendering pattern with `table-styles.ts` and `table-utils.ts`.

**Current state**: The `UserTable` component provides columns for Username, First Name, Last Name, Display Name, Description, and Joined date with username linking to user profiles. It needs minor changes for Phase 1: removing the Display Name column, the raw `{totalCount} Users Total` div, and the unused `hasMore`/`loadMore` button (see Section 6.3). After those fixes, it is functional for search use.

**Observation**: This creates a visual and architectural inconsistency:
- File tabs use `FoldersList`/`NetworksList` with custom row rendering, shared `table-styles`, and `@tanstack/react-virtual` for virtualization
- Users tab uses `@tanstack/react-table` with its own column definitions and rendering pipeline

**Recommendation for future release**: Refactor `UserTable` to follow the same rendering pattern as `FoldersList`/`NetworksList` for visual consistency and a unified codebase approach. This is not blocking for the initial implementation — the minor fixes listed above are sufficient for Phase 1.

### User Search API Details

The `useUserSearch` hook (`src/hooks/use-user-search.ts`) wraps `ndexClient.user.searchUsers(searchTerms, start, size)`:
- Returns `SearchResult<NDExUser>` with `{ ResultList, numFound, start }`
- Uses SWR with a page size of 2,000
- Returns `{ users, error, isLoading, total }`
- **Needs fixes for Phase 1**: the hook fabricates `numFound` as `users.length` instead of passing through the server's actual value, capping the tab count at 2,000 (see Section 6.3)
