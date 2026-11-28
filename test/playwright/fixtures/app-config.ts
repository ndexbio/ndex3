import * as fs from 'node:fs'
import * as path from 'node:path'
import { test as base, expect } from '@playwright/test'

/**
 * Fixtures for specs that need to vary `public/config.json` at runtime.
 *
 * The app fetches its config as a static asset at boot, so changing a config
 * value in a test means intercepting that fetch. Two details are load-bearing
 * and both were learned the hard way in `search-results.ts`:
 *
 *  1. The route matcher must be a regex, not the `**\/config.json` glob. The app
 *     sets `trailingSlash: true`, which rewrites the internal fetch to
 *     `/config.json/`, and the glob does not match that.
 *  2. The route must be installed on the `context` fixture, at context creation
 *     — not in a `beforeEach` with `page.route()`. A `beforeEach` leaves a race
 *     window in which firefox (and chromium under load) fires the config fetch
 *     before the handler attaches; the real file is served and the app hangs on
 *     its "Loading configuration..." boot screen.
 */

// Resolved relative to the repo root, which is where Playwright is invoked.
const CONFIG_PATH = path.resolve(process.cwd(), 'public/config.json')
const APP_CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Record<
  string,
  unknown
>

/** Metrics sink used by the tests. Must match what the spec asserts on. */
export const TEST_METRICS_URL = '/metrics'

function configFixture(overrides: Record<string, unknown>) {
  return base.extend({
    context: async ({ context }, use) => {
      const body = JSON.stringify({ ...APP_CONFIG, ...overrides })
      await context.route(/\/config\.json\/?$/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body,
        })
      })
      await use(context)
    },
  })
}

/** App config with a known `metricsUrl`, so tracking requests can be observed. */
export const test = configFixture({ metricsUrl: TEST_METRICS_URL })

/**
 * App config with `metricsUrl` explicitly blank, which is how a deployment
 * turns tracking off. Note this is not the same as removing the key — an
 * absent key falls back to the default endpoint.
 */
export const testWithoutMetrics = configFixture({ metricsUrl: '' })

/** Base path used by the subdirectory-deployment fixture below. */
export const TEST_BASE_PATH = '/test'

/**
 * App config declaring a subdirectory deployment.
 *
 * Scope, so this is not mistaken for more than it is: the app is still *served*
 * from the root here, because `basePath` is baked into the build and testing a
 * real subdirectory deployment would need a second `npm run build`. What this
 * does cover is that `urlBaseName` flows from the fetched config through
 * `ConfigContext` into the metrics URL builder in a real browser — i.e. that a
 * subdirectory deployment addresses its endpoint correctly. It does **not**
 * cover serving under a prefix, nor any Apache rewrite behaviour.
 */
export const testWithBasePath = configFixture({
  metricsUrl: TEST_METRICS_URL,
  urlBaseName: TEST_BASE_PATH,
})

export { expect }
