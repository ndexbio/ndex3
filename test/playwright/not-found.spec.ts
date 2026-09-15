import { test, testWithoutMetrics, expect, TEST_METRICS_URL } from './fixtures/app-config'

/**
 * Matches a metrics tracking request and nothing else.
 *
 * Deliberately not a substring test on "/not-found": Next serves a route chunk
 * named `not-found-<hash>.js`, which a looser filter counts as a tracking request.
 */
function isTrackingRequest(requestUrl: string): boolean {
  const url = new URL(requestUrl)
  return url.pathname.endsWith('/not-found') && url.searchParams.has('url')
}

/**
 * Not-found routing (issue #48).
 *
 * Runs against the real static export: the Playwright `webServer` builds the
 * app and serves `out/` the way Apache does, so these specs exercise the whole
 * chain — server fallback to the root document, hydration, and the client
 * router deciding the path matches nothing.
 *
 * The behaviour they exist to protect is that the app renders the not-found
 * view **in place**. An earlier design redirected the browser to a separate
 * page; the URL assertions below are what would catch a return to that.
 *
 * Note `/doesnotexist/` only reaches the app because `public/serve.json`
 * rewrites it. Those two entries are a test-only affordance mirroring Apache's
 * catch-all, which `serve` cannot express safely — see docs/not-found-routing.md.
 */

const UNKNOWN_PATHS = [
  // A wholly unrecognized top-level path — the URL shape from the issue.
  '/doesnotexist/',
  // A known prefix with too many segments: rewritten to the app by both Apache
  // and serve, but matching no route once it gets there.
  '/users/abc/extra/',
]

test.describe('unrecognized URLs', () => {
  for (const path of UNKNOWN_PATHS) {
    test(`${path} renders the not-found view at the same URL`, async ({ page }) => {
      await page.goto(path)

      await expect(page.getByTestId('page-not-found')).toBeVisible()
      await expect(page.getByTestId('page-not-found-path')).toHaveText(path)

      // The regression guard: no redirect. The address bar still holds what the
      // visitor typed, which is the most useful thing on screen for a typo.
      expect(new URL(page.url()).pathname).toBe(path)
    })
  }

  test('reports the requested path to the metrics sink', async ({ page }) => {
    // Attach before navigating: the tracking request fires during the first render.
    const trackingRequest = page.waitForRequest((request) => isTrackingRequest(request.url()))

    await page.goto('/doesnotexist/')

    const url = new URL((await trackingRequest).url())
    expect(url.pathname).toBe(`${TEST_METRICS_URL}/not-found`)
    expect(url.searchParams.get('url')).toBe('/doesnotexist/')
    // Shared links carry ?accesskey=<secret>; it must never reach a server log.
    expect(url.searchParams.get('accesskey')).toBeNull()
  })

  test('does not report a route it recognizes', async ({ page }) => {
    const trackingRequests: string[] = []
    page.on('request', (request) => {
      if (isTrackingRequest(request.url())) {
        trackingRequests.push(request.url())
      }
    })

    await page.goto('/')
    await expect(page.getByTestId('page-not-found')).toHaveCount(0)
    expect(trackingRequests).toEqual([])
  })
})

testWithoutMetrics.describe('unrecognized URLs with tracking turned off', () => {
  testWithoutMetrics(
    'still renders the not-found view, and sends no tracking request',
    async ({ page }) => {
      const trackingRequests: string[] = []
      page.on('request', (request) => {
        if (isTrackingRequest(request.url())) {
          trackingRequests.push(request.url())
        }
      })

      await page.goto('/doesnotexist/')

      await expect(page.getByTestId('page-not-found')).toBeVisible()
      expect(trackingRequests).toEqual([])
    },
  )
})

/**
 * Next's own boundary, `src/app/not-found.tsx`, exported as `404.html`.
 *
 * Nothing routes to this file behind the SPA catch-all, so it exists for
 * `npm run dev` parity and for deployments that wire it up as an
 * `ErrorDocument`. It is worth one test because it is otherwise unexercised:
 * the prerendered HTML is the config provider's loading screen (as it is for
 * every page in this app), and the view only appears once the app hydrates.
 */
test.describe('the exported 404 document', () => {
  test('renders the not-found view after hydration', async ({ page }) => {
    await page.goto('/404.html')

    await expect(page.getByTestId('page-not-found')).toBeVisible()
    // This boundary prerenders, so it has no window to read a path from.
    await expect(page.getByTestId('page-not-found-path')).toHaveCount(0)
  })
})

/**
 * The failure this change is most likely to cause is a good route being
 * mistaken for an unknown one, so every route family gets a look.
 */
test.describe('recognized routes are unaffected', () => {
  const KNOWN_PATHS = [
    '/',
    '/search/',
    '/about/',
    '/folders/some-folder-uuid/',
    '/users/some-user-uuid/',
  ]

  for (const path of KNOWN_PATHS) {
    test(`${path} does not render the not-found view`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByTestId('page-not-found')).toHaveCount(0)
    })
  }

  test('/networkset/{uuid}/ still redirects to the folder route', async ({ page }) => {
    await page.goto('/networkset/legacy-uuid/')

    await expect(page).toHaveURL(/\/folders\/legacy-uuid\/?$/)
    await expect(page.getByTestId('page-not-found')).toHaveCount(0)
  })
})
