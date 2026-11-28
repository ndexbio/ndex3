import { test as base, expect, Page, Route } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Fixture for specs that need a *signed-in* user.
 *
 * The anonymous fixtures short-circuit Keycloak's silent SSO check with
 * `login_required`. Here we do the opposite: play the part of the auth server
 * so `check-sso` succeeds and the app boots authenticated. keycloak-js does not
 * verify token signatures in the browser, so unsigned tokens with the right
 * claims are enough — the state and nonce it generated are echoed back from the
 * intercepted authorization request, which is what it actually checks.
 */

const CONFIG_PATH = path.resolve(process.cwd(), 'public/config.json')
const APP_CONFIG_JSON = fs.readFileSync(CONFIG_PATH, 'utf-8')
const CONFIG_ROUTE = /\/config\.json\/?$/

const KEYCLOAK_AUTH_ROUTE = /openid-connect\/auth\?/
const KEYCLOAK_TOKEN_ROUTE = /openid-connect\/token$/
const KEYCLOAK_USERINFO_ROUTE = /openid-connect\/userinfo$/

export const TEST_USER = {
  externalId: 'user-uuid-1',
  // The header renders `user.name[0]` as the avatar initial, so this must be
  // present for the app to mount at all.
  name: 'Test User',
  userName: 'testuser',
  emailAddress: 'testuser@example.com',
  firstName: 'Test',
  lastName: 'User',
  isIndividual: true,
  diskUsed: 0,
  diskQuota: 1_000_000_000,
}

const base64url = (value: string): string =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** Unsigned JWT — enough for keycloak-js, which only parses the payload. */
const makeJwt = (claims: Record<string, unknown>): string => {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      exp: now + 3600,
      iat: now,
      auth_time: now,
      sub: TEST_USER.externalId,
      typ: 'Bearer',
      // The header reads `tokenParsed.name[0]` for the avatar initial, so the
      // token must carry a name claim or the app crashes on mount.
      name: TEST_USER.name,
      preferred_username: TEST_USER.userName,
      email: TEST_USER.emailAddress,
      email_verified: true,
      ...claims,
    }),
  )
  return `${header}.${payload}.signature-not-verified-in-browser`
}

export const test = base.extend({
  context: async ({ context }, use) => {
    // Captured from the authorization request so the token response can echo
    // the nonce keycloak-js stored — it rejects an id_token whose nonce differs.
    let nonce = ''

    await context.route(CONFIG_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: APP_CONFIG_JSON,
      })
    })

    // 1. Silent check-sso: redirect straight back with an authorization code.
    await context.route(KEYCLOAK_AUTH_ROUTE, async (route) => {
      const url = new URL(route.request().url())
      const redirectUri = url.searchParams.get('redirect_uri') || ''
      const state = url.searchParams.get('state') || ''
      nonce = url.searchParams.get('nonce') || ''

      await route.fulfill({
        status: 302,
        headers: {
          location: `${redirectUri}#code=fake-auth-code&state=${state}&session_state=fake-session`,
        },
        body: '',
      })
    })

    // 2. Code-for-token exchange.
    await context.route(KEYCLOAK_TOKEN_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: makeJwt({ typ: 'Bearer' }),
          refresh_token: makeJwt({ typ: 'Refresh' }),
          id_token: makeJwt({ typ: 'ID', nonce }),
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_expires_in: 7200,
          session_state: 'fake-session',
          scope: 'openid profile email',
        }),
      })
    })

    await context.route(KEYCLOAK_USERINFO_ROUTE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sub: TEST_USER.externalId,
          preferred_username: TEST_USER.userName,
          email: TEST_USER.emailAddress,
          email_verified: true,
        }),
      })
    })

    // 3. NDEx sign-in — the app treats a successful response as "verified".
    await context.route('**/v3/users/signin', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEST_USER),
      })
    })

    await use(context)
  },
})

export { expect }

export interface TrashableTree {
  /** Items in the user's home folder. */
  home: Record<string, unknown>[]
  /** Contents keyed by folder uuid. */
  folders?: Record<string, Record<string, unknown>[]>
  /** Folder metadata keyed by uuid, returned by GET /files/folders/{id}. */
  folderMeta?: Record<string, Record<string, unknown>>
  /** Network uuids whose DELETE should fail, to exercise error reporting. */
  failNetworkDeletes?: string[]
}

export interface RecordedDeletes {
  networks: string[]
  folders: string[]
  shortcuts: string[]
}

export interface RestoreRequest {
  networks: string[]
  folders: string[]
  shortcuts: string[]
}

/**
 * Mocks the trash endpoints.
 *
 * `items` is what GET /files/trash returns. Anything the caller omits a
 * `parent` from forces the UI down its per-item parent-lookup path, which
 * `summaries` then answers — that fallback exists because the trash listing
 * is not guaranteed to carry parentage.
 */
export async function mockTrash(
  page: Page,
  opts: {
    items: Record<string, unknown>[]
    /** Folder metadata by uuid for GET /files/folders/{id}. */
    folderMeta?: Record<string, Record<string, unknown>>
    /** Network summaries by uuid for GET /networks/{id}/summary. */
    summaries?: Record<string, Record<string, unknown>>
  },
): Promise<RestoreRequest[]> {
  const restores: RestoreRequest[] = []

  const json = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

  await page.route('**/v3/files/trash/restore', async (route) => {
    restores.push(route.request().postDataJSON() as RestoreRequest)
    await json(route, {})
  })
  await page.route('**/v3/files/trash', (route) => json(route, opts.items))

  await page.route('**/v3/networks/*/summary**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2) as string
    return json(route, opts.summaries?.[id] ?? { externalId: id })
  })

  await page.route('**/v3/files/folders/*/list**', (route) => json(route, []))

  await page.route('**/v3/files/folders/*', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1) as string
    return json(route, opts.folderMeta?.[id] ?? { uuid: id, name: id })
  })

  return restores
}

/**
 * Mocks the file endpoints the account page uses, backed by an in-memory tree
 * so the cascade is exercised against a server that behaves like NDEx: folder
 * listings shrink as their contents are deleted, and deleting a non-empty
 * folder is rejected (the GI-46 server behaviour).
 */
export async function mockFileTree(
  page: Page,
  tree: TrashableTree,
): Promise<RecordedDeletes> {
  const contents: Record<string, Record<string, unknown>[]> = {
    home: [...tree.home],
    ...Object.fromEntries(
      Object.entries(tree.folders ?? {}).map(([id, items]) => [id, [...items]]),
    ),
  }

  const recorded: RecordedDeletes = { networks: [], folders: [], shortcuts: [] }

  const removeEverywhere = (uuid: string) => {
    for (const key of Object.keys(contents)) {
      contents[key] = contents[key].filter((item) => item.uuid !== uuid)
    }
  }

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })

  await page.route('**/v3/files/trash', (route) => json(route, []))

  await page.route('**/v3/files/folders/*/list**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2) as string
    return json(route, contents[id] ?? [])
  })

  await page.route('**/v3/files/folders/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1) as string

    if (route.request().method() === 'DELETE') {
      if ((contents[id]?.length ?? 0) > 0) {
        // What the real server does — the whole reason the cascade exists.
        return json(
          route,
          { errorCode: 'NDEx_Exception', message: 'the folder is not empty' },
          400,
        )
      }
      recorded.folders.push(id)
      removeEverywhere(id)
      return json(route, {})
    }

    return json(route, tree.folderMeta?.[id] ?? { uuid: id, name: id })
  })

  await page.route('**/v3/files/shortcuts/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1) as string
    if (route.request().method() === 'DELETE') {
      recorded.shortcuts.push(id)
      removeEverywhere(id)
      return json(route, {})
    }
    return json(route, { uuid: id, name: id })
  })

  await page.route('**/v3/networks/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1) as string
    if (route.request().method() === 'DELETE') {
      if (tree.failNetworkDeletes?.includes(id)) {
        return json(
          route,
          { errorCode: 'NDEx_Unauthorized', message: 'permission denied' },
          403,
        )
      }
      recorded.networks.push(id)
      removeEverywhere(id)
      return json(route, {})
    }
    return route.fallback()
  })

  return recorded
}
