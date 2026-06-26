import { Page } from '@playwright/test'

// Minimal items mirroring the /v3/search/files shape.
// Known composition lets us assert exact filter counts.
export const PUBLIC_ITEMS = [
  { uuid: 'pub-net-1', type: 'NETWORK', name: 'Public Network One', visibility: 'PUBLIC', owner: 'alice', attributes: {} },
  { uuid: 'pub-net-2', type: 'NETWORK', name: 'Public Network Two', visibility: 'PUBLIC', owner: 'bob', attributes: {} },
  { uuid: 'pub-fold-1', type: 'FOLDER', name: 'Public Folder', owner: 'alice', attributes: {} },
]

export const PRIVATE_ITEMS = [
  { uuid: 'priv-net-1', type: 'NETWORK', name: 'My Private Network', visibility: 'PRIVATE', owner: 'testuser', attributes: {} },
  { uuid: 'priv-short-1', type: 'SHORTCUT', name: 'My Shortcut', visibility: 'PRIVATE', owner: 'testuser', attributes: { target_type: 'NETWORK', target: 'pub-net-1', target_status: 'ACTIVE' } },
]

function searchBody(items: unknown[]) {
  return { numFound: items.length, start: 0, files: items }
}

/**
 * Intercept /v3/search/files and branch on the visibility query param.
 * The page fires two requests (PUBLIC and PRIVATE) and merges them.
 * Pass privateItems: null to simulate an anonymous user (private call still
 * happens but returns empty, mirroring no-auth results).
 */
export async function mockFileSearch(
  page: Page,
  opts: { publicItems?: unknown[]; privateItems?: unknown[] } = {}
) {
  const pub = opts.publicItems ?? PUBLIC_ITEMS
  const priv = opts.privateItems ?? PRIVATE_ITEMS

  await page.route('**/v3/search/files**', async (route) => {
    const url = new URL(route.request().url())
    const visibility = url.searchParams.get('visibility')
    const items = visibility === 'PUBLIC' ? pub : priv
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(searchBody(items)),
    })
  })
}