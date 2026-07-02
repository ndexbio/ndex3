import { test, expect } from './fixtures/search-results'
import { mockFileSearch } from './fixtures/search-results'

// Profile route is centralized so it's a one-line change if the app router
// path shifts (e.g. /user/[uuid] vs /users/[uuid]).
const PROFILE_ROUTE = '/users'

// Two regexes with slightly different semantics:
// - hrefPattern is anchored — the <a href> attribute is a bare path like
//   "/users/uuid-alice-1234/" so we want an exact match.
// - urlPattern is NOT anchored to start — Playwright's toHaveURL matches
//   against the full URL including scheme and host, so anchoring to the
//   start would never match.
// Both accept an optional trailing slash because Next.js apps with
// `trailingSlash: true` (this one included) rewrite internal Link hrefs
// to include a trailing slash.
const profileHrefPattern = (uuid: string) =>
  new RegExp(`^${PROFILE_ROUTE}/${uuid}/?$`)
const profileUrlPattern = (uuid: string) =>
  new RegExp(`${PROFILE_ROUTE}/${uuid}/?$`)

// Local items with known ownerUUIDs so we can assert exact hrefs.
// The last item deliberately omits ownerUUID to exercise the defensive
// plain-text fallback for older records.
const ITEMS = [
  {
    uuid: 'net-alice',
    type: 'NETWORK',
    name: 'Alice Network',
    visibility: 'PUBLIC',
    owner: 'alice',
    ownerUUID: 'uuid-alice-1234',
    attributes: {},
  },
  {
    uuid: 'net-bob',
    type: 'NETWORK',
    name: 'Bob Network',
    visibility: 'PUBLIC',
    owner: 'bob',
    ownerUUID: 'uuid-bob-5678',
    attributes: {},
  },
  {
    uuid: 'fold-alice',
    type: 'FOLDER',
    name: 'Alice Folder',
    owner: 'alice',
    ownerUUID: 'uuid-alice-1234',
    attributes: {},
  },
  // Legacy record: owner set, ownerUUID missing. Should render as plain text.
  {
    uuid: 'net-legacy',
    type: 'NETWORK',
    name: 'Legacy Network',
    visibility: 'PUBLIC',
    owner: 'carol',
    attributes: {},
  },
]

test.describe('search results — owner links (anonymous viewer)', () => {
  // Webkit's silent Keycloak auth check redirects to an #error=login_required
  // hash before search content renders. That's an app-level issue independent
  // of these tests — track separately and re-enable webkit once auth is mocked.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Keycloak silent SSO check redirects webkit; separate fix needed.'
  )

  test.beforeEach(async ({ page }) => {
    // /config.json is mocked at context creation by the fixture.
    await mockFileSearch(page, { publicItems: ITEMS, privateItems: [] })
    // Trailing slash to match the app's trailingSlash:true config and avoid
    // the 308 redirect that happens when navigating to /search?q=test.
    await page.goto('/search/?q=test')
  })

  test('renders each owner as a link to /users/<ownerUUID>', async ({
    page,
  }) => {
    const aliceLink = page.locator(
      '[data-item="net-alice"] [data-testid="owner-link"]'
    )
    await expect(aliceLink).toBeVisible()
    await expect(aliceLink).toHaveAttribute(
      'href',
      profileHrefPattern('uuid-alice-1234')
    )
    await expect(aliceLink).toHaveText('alice')

    const bobLink = page.locator(
      '[data-item="net-bob"] [data-testid="owner-link"]'
    )
    await expect(bobLink).toHaveAttribute(
      'href',
      profileHrefPattern('uuid-bob-5678')
    )
    await expect(bobLink).toHaveText('bob')
  })

  test('href uses the ownerUUID, not the owner username', async ({ page }) => {
    // Guard against a regression where someone "helpfully" reintroduces
    // the username as the slug because it's more human-readable.
    const bobLink = page.locator(
      '[data-item="net-bob"] [data-testid="owner-link"]'
    )
    await expect(bobLink).toBeVisible()

    const href = await bobLink.getAttribute('href')
    expect(href).toMatch(profileHrefPattern('uuid-bob-5678'))
    expect(href).not.toContain('/bob')
  })

  test('renders links for folder owners too, not just networks', async ({
    page,
  }) => {
    // The OwnerCell lives in both FoldersList and NetworksList; this catches
    // a scenario where only one of the two consumers got wired up.
    const folderLink = page.locator(
      '[data-item="fold-alice"] [data-testid="owner-link"]'
    )
    await expect(folderLink).toBeVisible()
    await expect(folderLink).toHaveAttribute(
      'href',
      profileHrefPattern('uuid-alice-1234')
    )
  })

  test('falls back to plain text when ownerUUID is missing', async ({
    page,
  }) => {
    const legacyRow = page.locator('[data-item="net-legacy"]')
    const ownerCell = legacyRow.locator('[data-testid="owner-cell"]')

    // Owner name still visible...
    await expect(ownerCell).toHaveText('carol')
    // ...but nothing to click into.
    await expect(legacyRow.locator('[data-testid="owner-link"]')).toHaveCount(0)
  })

  test('clicking the owner link navigates to the profile route', async ({
    page,
  }) => {
    const aliceLink = page.locator(
      '[data-item="net-alice"] [data-testid="owner-link"]'
    )
    await expect(aliceLink).toBeVisible()

    await aliceLink.click()
    await expect(page).toHaveURL(profileUrlPattern('uuid-alice-1234'))
  })
})