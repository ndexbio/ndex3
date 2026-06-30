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

/**
 * Paginated mock for the public /v3/search/files calls.
 *
 * The page uses useSWRInfinite with a hardcoded page size of 500, and
 * hasMore = (pagesLoaded * 500) < numFound. So to exercise "Load more"
 * we report a numFound > 500 while serving small slices keyed on `start`.
 *
 * - start=0   -> page1 items, numFound
 * - start=500 -> page2 items, numFound
 * After page 2 loads, size=2 -> 2*500=1000 < numFound(600) is false -> button gone.
 */
export async function mockFileSearchPaginated(
  page: Page,
  opts: {
    page1: unknown[]
    page2: unknown[]
    numFound: number // must be > 500 and <= 1000 to give exactly one "load more"
  }
) {
  await page.route('**/v3/search/files**', async (route) => {
    const url = new URL(route.request().url())
    const visibility = url.searchParams.get('visibility')
    const start = Number(url.searchParams.get('start') ?? '0')

    // Anonymous: only PUBLIC is requested. Return empty for anything else.
    if (visibility !== 'PUBLIC') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ numFound: 0, start, files: [] }),
      })
      return
    }

    const items = start === 0 ? opts.page1 : opts.page2
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ numFound: opts.numFound, start, files: items }),
    })
  })
}