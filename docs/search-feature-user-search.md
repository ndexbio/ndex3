# User Search Feature — Deferred Design

> **Status**: User search is currently **removed** from the NDEx3 search feature. This document preserves the original design for the Users tab so it can be re-implemented in a future version if needed.

---

## Overview

The search feature originally included a **Users tab** alongside the file search tabs (My Networks, Public, Private). The Users tab provided user discovery — searching for NDEx user accounts by name or description — alongside file search results.

This feature was removed from the initial NDEx3 release to reduce scope. The file search tabs (My Networks, Public, Private) are the core functionality; user search can be added back independently.

---

## Original Tab Design

### Tab Layout (Signed-in Users — 4 tabs)

| Tab | Data Source | Sort | Pagination |
|-----|-------------|------|------------|
| My Networks | 2 dedicated API calls with `accountName=me`, merged | Column-header sorting | Single fetch (3,000 cap per call) |
| Public | 1 API call, all public results | Fixed: Relevance | Infinite scroll (500 per page) |
| Private | 1 API call, all private results | Fixed: Relevance | Infinite scroll (500 per page) |
| **Users** | **1 `searchUsers` API call** | **Fixed: Relevance (server order)** | **Single fetch, no pagination (2,000 cap)** |

For anonymous users, two tabs were shown: **Networks** and **Users**.

### API Call

The Users tab used a separate API from file search:

```typescript
ndexClient.user.searchUsers(searchTerms, start, size)
```

- **Page size**: 2,000 (single fetch)
- **Authentication**: Not required (user profiles are public)
- **Response**: `SearchResult<NDExUser>` with `{ ResultList, numFound, start }`

For signed-in users, 5 parallel API calls were made on search submit (4 file search + 1 user search). For anonymous users, 2 calls (1 file search + 1 user search).

### Tab Count and Truncation

The Users tab used the same truncation pattern as My Networks:
- Single fetch of up to 2,000 results with the server's `numFound` for the tab count
- When loaded results < `numFound`, the `+` suffix and inline message were shown: e.g., "Users (3,500+)" with "Showing 2,000 of 3,500 results — refine your search to see all matches."
- The filter bar info icon was **not** shown on the Users tab because the filter bar was hidden there — no filters, sorting, or bulk actions apply to user results

### Users Tab Content

The Users tab replaced the two-pane folder/network layout with a single `UserTable` component displaying matching user accounts:

| Column | Description |
|--------|-------------|
| Username | Linked to user's profile page (`/users/{externalId}`) |
| First Name | User's first name |
| Last Name | User's last name |
| Description | User's profile description |
| Joined on | Account creation date |

- No selection toolbar — user results are read-only (clickable to view profile)
- No filters — edge count and other file filters do not apply to users; the filter bar was hidden when this tab was active
- No sorting controls — fixed server-order relevance with a static "Sorted by relevance" badge

---

## Components

### UserTable

**Location**: `src/app/search/_components/UserTable.tsx`

Used `@tanstack/react-table` for rendering. This was architecturally inconsistent with `FoldersList`/`NetworksList` (which use custom rendering with `table-styles.ts`). A future implementation should consider aligning `UserTable` with the same rendering pattern for visual consistency.

### useUserSearch Hook

**Location**: `src/hooks/use-user-search.ts`

Wraps `ndexClient.user.searchUsers()` with SWR caching:
- Returns `{ users, error, isLoading, total }`
- `total` passes through the server's `numFound`
- Uses SWR with `revalidateOnFocus: false`

---

## Error Handling

- **Per-tab inline error**: If `searchUsers` failed, the Users tab showed an inline error with a retry button, identical to other tab error states
- **Partial failure**: User search failure did not affect file tabs — My Networks, Public, Private results were shown normally
- **Full failure**: If all API calls (file + user) failed, the page escalated to the `error.tsx` boundary
- **Tab header on error**: Count was hidden (e.g., "Users" instead of "Users (12)")

---

## Permissions

- **Anonymous users**: View user profiles (read-only)
- **Signed-in users**: Same — no bulk actions or selection on user results
- Users tab had no selection toolbar and no context menu (`ActionDropdown`)

---

## Implementation Notes

### Tab Validation

When user search was included:
- Anonymous users: `networks` and `users` tabs valid
- Signed-in users: `my-networks`, `public`, `private`, `users` tabs valid
- Invalid `?tab=users` for anonymous → fell back to `networks`

### Auth Transitions

| Scenario | Behavior |
|----------|----------|
| User signs in while on `users` tab | Tab set expanded to 4 tabs, active tab stayed `users`, 3 additional file API calls fired |
| User signs out while on `users` tab | Tab set contracted to 2 tabs, active tab stayed `users` |

### Performance Concern

`UserTable` rendered all rows into the DOM without virtualization. With 2,000 users, this produced 12,000+ DOM nodes. If re-implementing, add `@tanstack/react-virtual` or refactor to match `FoldersList`/`NetworksList` pattern.

---

## Re-implementation Checklist

If adding user search back in a future version:

1. Re-add `useUserSearch` hook call in `SearchResultsPage`
2. Add Users tab trigger and content to the `Tabs` component
3. Restore `UserTable` component (or rebuild following `FoldersList`/`NetworksList` pattern)
4. Update tab types to include `'users'` for both signed-in and anonymous
5. Update tab validation logic for auth transitions
6. Add user search API call count back (5 calls for signed-in, 2 for anonymous)
7. Update error handling for the additional API call
8. Update the main `search-feature.md` documentation
