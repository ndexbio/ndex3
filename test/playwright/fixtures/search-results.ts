import * as fs from 'node:fs'
import * as path from 'node:path'
import { test as base, expect, Page } from '@playwright/test'

// Read public/config.json once at module load. Tests own this data — the dev
// server is not involved. If the real config file grows a new required field,
// the tests pick it up automatically on the next run.
//
// Path is resolved relative to the repo root (process.cwd() at test time),
// which is where Playwright is invoked from.
const CONFIG_PATH = path.resolve(process.cwd(), 'public/config.json')
const APP_CONFIG_JSON = fs.readFileSync(CONFIG_PATH, 'utf-8')

// Regex matcher for /config.json with optional trailing slash. Next.js's
// trailingSlash:true config rewrites internal fetches to include a trailing
// slash; the `**/config.json` glob doesn't match `/config.json/`. Regex
// gives us tighter control.
const CONFIG_ROUTE = /\/config\.json\/?$/

// Override the `context` fixture to install the /config.json mock during
// context creation, BEFORE Playwright creates the page for the test. Doing
// this in beforeEach with page.route() leaves a race window where firefox
// (and occasionally chromium under load) can fire the fetch before the route
// handler finishes attaching, letting the real request through and hanging
// the app on the "Loading configuration..." boot screen.
//
// Any spec that imports `test` from this file gets this behavior for free.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(CONFIG_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: APP_CONFIG_JSON,
      })
    })
    await use(context)
  },
})

export { expect }

// Legacy explicit helper — kept for any spec that still uses page.route in a
// beforeEach. New specs should import `test` above instead; the config mock
// then attaches at context creation and there's no need to call this.
export async function mockAppBoot(page: Page) {
  await page.route(CONFIG_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: APP_CONFIG_JSON,
    })
  })
}

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
