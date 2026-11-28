import { test as base, expect, Page, Route } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Reuse the config mock so the app boots without hitting a real server.
const CONFIG_PATH = path.resolve(process.cwd(), 'public/config.json')
const APP_CONFIG_JSON = fs.readFileSync(CONFIG_PATH, 'utf-8')
const CONFIG_ROUTE = /\/config\.json\/?$/

// Keycloak's check-sso silent login opens a hidden iframe pointing at the
// real auth server, which is unreachable in tests — so init() would hang and
// the app would spin forever on `isInitializing`. Short-circuit it: reply to
// the OIDC auth request with the redirect Keycloak expects for an
// unauthenticated `prompt=none` check (back to the silent-check page with
// `#error=login_required`). Init then resolves cleanly as "anonymous".
const KEYCLOAK_AUTH_ROUTE = /openid-connect\/auth\?/

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(CONFIG_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: APP_CONFIG_JSON,
      })
    })
    await context.route(KEYCLOAK_AUTH_ROUTE, async (route) => {
      const url = new URL(route.request().url())
      const redirectUri = url.searchParams.get('redirect_uri') || ''
      const state = url.searchParams.get('state') || ''
      await route.fulfill({
        status: 302,
        headers: {
          location: `${redirectUri}#error=login_required&state=${state}`,
        },
        body: '',
      })
    })
    await use(context)
  },
})

export { expect }

export interface FolderMock {
  /** Folder metadata returned by GET /v3/files/folders/{id}. */
  folder?: Record<string, unknown>
  /** Contents returned by GET /v3/files/folders/{id}/list. */
  items?: unknown[]
  /** When set, both folder endpoints reject with this HTTP status. */
  status?: number
}

/**
 * Intercept the two folder endpoints the page calls:
 *   GET /v3/files/folders/{id}       -> metadata (useFolder)
 *   GET /v3/files/folders/{id}/list  -> contents (useFolderContents)
 *
 * The `/list` route is registered first because Playwright matches the most
 * recently added route first, and both share the `/folders/{id}` prefix.
 */
export async function mockFolder(page: Page, opts: FolderMock) {
  const { folder, items = [], status } = opts

  const rejectOr = async (route: Route, body: unknown) => {
    if (status) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: `HTTP ${status}` }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  }

  await page.route('**/v3/files/folders/*', (route) =>
    rejectOr(route, folder ?? { uuid: 'f-1', name: 'A Folder', owner: 'someone' }),
  )
  await page.route('**/v3/files/folders/*/list**', (route) =>
    rejectOr(route, items),
  )
}
