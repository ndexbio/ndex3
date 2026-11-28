import { test, expect, mockFileTree, TEST_USER } from './fixtures/authenticated'

// Search results offer the same Move to Trash action as the account page, and
// used to run their own copy of the delete loop — which reported success even
// when part of the batch had failed. Both surfaces now share one cascade and
// one confirmation, so this spec guards the search-side wiring.

const OWNED_FOLDER = {
  uuid: 'folder-1',
  type: 'FOLDER',
  name: 'Searchable Folder',
  visibility: 'PRIVATE',
  owner: TEST_USER.userName,
  ownerUUID: TEST_USER.externalId,
  modificationTime: 1700000000000,
  attributes: {},
}

const NETWORK_INSIDE = {
  uuid: 'net-inside',
  type: 'NETWORK',
  name: 'Network Inside Searchable',
  visibility: 'PRIVATE',
  owner: TEST_USER.userName,
  ownerUUID: TEST_USER.externalId,
  modificationTime: 1700000000000,
  attributes: {},
}

/** Serves the folder as a private search hit for the signed-in owner. */
async function mockSearch(page: import('@playwright/test').Page) {
  await page.route('**/v3/search/files**', async (route) => {
    const visibility = new URL(route.request().url()).searchParams.get(
      'visibility',
    )
    const files = visibility === 'PUBLIC' ? [] : [OWNED_FOLDER]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ numFound: files.length, start: 0, files }),
    })
  })
}

test.describe('move to trash from search results', () => {
  test('confirms, cascades, and reports success', async ({ page }) => {
    const deletes = await mockFileTree(page, {
      home: [],
      folders: { 'folder-1': [NETWORK_INSIDE] },
      folderMeta: { 'folder-1': { ...OWNED_FOLDER, parent: '' } },
    })
    await mockSearch(page)

    await page.goto('/search/?q=folder')
    await expect(page.getByText('Searchable Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Searchable Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByRole('button', { name: 'Move to Trash' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Move folder to trash?')
    await expect(dialog).toContainText('30 days')
    await dialog.getByRole('button', { name: 'OK' }).click()

    await expect
      .poll(() => deletes.networks, { timeout: 15_000 })
      .toEqual(['net-inside'])
    await expect.poll(() => deletes.folders).toEqual(['folder-1'])
  })

  test('does not claim success when the cascade fails', async ({ page }) => {
    const deletes = await mockFileTree(page, {
      home: [],
      folders: { 'folder-1': [NETWORK_INSIDE] },
      folderMeta: { 'folder-1': { ...OWNED_FOLDER, parent: '' } },
      failNetworkDeletes: ['net-inside'],
    })
    await mockSearch(page)

    await page.goto('/search/?q=folder')
    await expect(page.getByText('Searchable Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Searchable Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByRole('button', { name: 'Move to Trash' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click()

    await expect(
      page.getByText('"Searchable Folder" could not be moved to trash', {
        exact: true,
      }),
    ).toBeVisible()
    // The old code toasted "Moved to trash" regardless of the outcome.
    await expect(page.getByText('Moved to trash', { exact: true })).toHaveCount(0)
    expect(deletes.folders).toEqual([])
  })

  test('cancelling deletes nothing', async ({ page }) => {
    const deletes = await mockFileTree(page, {
      home: [],
      folders: { 'folder-1': [NETWORK_INSIDE] },
      folderMeta: { 'folder-1': { ...OWNED_FOLDER, parent: '' } },
    })
    await mockSearch(page)

    await page.goto('/search/?q=folder')
    await expect(page.getByText('Searchable Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Searchable Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByRole('button', { name: 'Move to Trash' }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cancel' })
      .click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(deletes).toEqual({ networks: [], folders: [], shortcuts: [] })
  })
})
