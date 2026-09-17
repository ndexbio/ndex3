import { test, expect, mockFolder } from './fixtures/folder-view'

// NDEx2's AngularJS app was hash-routed, so a group link looks like
// `/#/group/{uuid}` — the fragment never reaches the server, and the browser is
// simply served the root document. LegacyHashRedirect (mounted in the root
// layout) is what turns that into a real folder URL.
//
// Groups were migrated to folders keeping their UUID, so the redirect is a
// straight prefix swap. These specs drive the whole hop end to end: only the
// *folder* endpoints are mocked, so if the redirect failed to fire the page
// would sit on the home view and the folder contents would never appear.

const GROUP_UUID = '6a554a61-a788-11ef-99aa-005056ae3c32'

test.describe('legacy #/group/{uuid} links', () => {
  // WebKit's silent Keycloak SSO check redirects before content renders — the
  // same known issue skipped in folder-view.spec.ts and owner-link.spec.ts.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Keycloak silent SSO check redirects webkit; separate fix needed.',
  )

  test('lands on the folder view for the migrated group', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: GROUP_UUID, name: 'Migrated Group Folder', owner: 'alice' },
      items: [
        {
          uuid: 'net-1',
          type: 'NETWORK',
          name: 'Group Network One',
          visibility: 'PUBLIC',
          owner: 'alice',
          attributes: {},
        },
      ],
    })

    await page.goto(`/#/group/${GROUP_UUID}`)

    // The contents rendering is the real proof the hop completed: a redirect
    // that lands anywhere else cannot show them.
    await expect(page.getByText('Group Network One')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/folders/${GROUP_UUID}/?$`))
    // The legacy URL is replaced, not pushed, so Back must not return to it.
    expect(await page.evaluate(() => window.location.hash)).toBe('')
  })

  test('carries an access key across the redirect', async ({ page }) => {
    await mockFolder(page, {
      folder: { uuid: GROUP_UUID, name: 'Migrated Group Folder', owner: 'alice' },
      items: [],
    })

    await page.goto(`/#/group/${GROUP_UUID}?accesskey=secret-key`)

    await expect(page).toHaveURL(
      new RegExp(`/folders/${GROUP_UUID}/?\\?accesskey=secret-key$`),
    )
  })

  test('leaves the legacy group-permissions link alone', async ({ page }) => {
    // NDEx3 has no equivalent of the Angular group-access screen. The hash must
    // not be mistaken for a group link and sent to a folder that isn't there.
    await page.goto(`/#/access/group/${GROUP_UUID}`)

    await expect(page).toHaveURL(new RegExp(`#/access/group/${GROUP_UUID}$`))
  })
})
