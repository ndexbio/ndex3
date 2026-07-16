import { test, expect, mockFolder } from './fixtures/folder-view'

// The folder view is rendered client-side for anonymous visitors. These specs
// drive the real UI against mocked NDEx endpoints — the server decides what an
// anonymous caller sees, and the UI must render contents, an access-denied
// message, or a not-found message accordingly.

const FOLDER_UUID = 'test-folder-uuid'

const PUBLIC_ITEMS = [
  {
    uuid: 'net-1',
    type: 'NETWORK',
    name: 'Public Network One',
    visibility: 'PUBLIC',
    owner: 'alice',
    attributes: {},
  },
  {
    uuid: 'net-2',
    type: 'NETWORK',
    name: 'Public Network Two',
    visibility: 'PUBLIC',
    owner: 'alice',
    attributes: {},
  },
]

test.describe('folder view — anonymous visitor', () => {
  // WebKit's silent Keycloak SSO check redirects before content renders — the
  // same known issue skipped in owner-link.spec.ts.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Keycloak silent SSO check redirects webkit; separate fix needed.',
  )

  test('renders public folder contents (the original GI-33 bug)', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: FOLDER_UUID, name: 'Alice Public Folder', owner: 'alice' },
      items: PUBLIC_ITEMS,
    })

    await page.goto(`/folders/${FOLDER_UUID}/`)

    await expect(page.getByText('Public Network One')).toBeVisible()
    await expect(page.getByText('Public Network Two')).toBeVisible()
  })

  test('shows an access-denied message for a private folder', async ({ page }) => {
    await mockFolder(page, { status: 403 })

    await page.goto(`/folders/${FOLDER_UUID}/`)

    await expect(
      page.getByText("You don't have permission to view this folder"),
    ).toBeVisible()
    // Anonymous viewers get a sign-in affordance
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('renders contents when a valid access key is supplied', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: FOLDER_UUID, name: 'Shared Folder', owner: 'alice' },
      items: PUBLIC_ITEMS,
    })

    await page.goto(`/folders/${FOLDER_UUID}/?accesskey=secret-key`)

    await expect(page.getByText('Public Network One')).toBeVisible()
  })

  test('passes the page access key to the network viewer on double-click', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: FOLDER_UUID, name: 'Shared Folder', owner: 'alice' },
      items: PUBLIC_ITEMS,
    })

    await page.goto(`/folders/${FOLDER_UUID}/?accesskey=shared-key`)
    await expect(page.getByText('Public Network One')).toBeVisible()
    await page.evaluate(() => {
      window.open = ((url?: string | URL) => {
        ;(window as typeof window & { __openedUrl?: string }).__openedUrl = String(url)
        return null
      }) as typeof window.open
    })

    await page.getByText('Public Network One').dblclick()

    const openedUrl = await page.evaluate(
      () => (window as typeof window & { __openedUrl?: string }).__openedUrl,
    )
    expect(openedUrl).toBeDefined()
    const parsedUrl = new URL(openedUrl!)
    expect(parsedUrl.pathname).toBe('/viewer/networks/net-1')
    expect(parsedUrl.searchParams.get('accesskey')).toBe('shared-key')
  })

  test('shows a not-found message for a missing folder', async ({ page }) => {
    await mockFolder(page, { status: 404 })

    await page.goto(`/folders/${FOLDER_UUID}/`)

    await expect(page.getByText("This folder doesn't exist")).toBeVisible()
  })

  test('does not render the account sidebar for anonymous viewers', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: FOLDER_UUID, name: 'Alice Public Folder', owner: 'alice' },
      items: PUBLIC_ITEMS,
    })

    await page.goto(`/folders/${FOLDER_UUID}/`)
    await expect(page.getByText('Public Network One')).toBeVisible()

    // The sidebar links into the account-scoped views — never shown anonymously
    await expect(page.getByText('Shared with me')).toHaveCount(0)
    await expect(page.getByText('Trash')).toHaveCount(0)
  })
})
