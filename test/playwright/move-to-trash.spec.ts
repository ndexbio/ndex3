import { test, expect, mockFileTree } from './fixtures/authenticated'

// GI-46: moving a folder that contains networks to the trash used to fail
// silently — the server rejects deleting a non-empty folder, and the UI
// swallowed the rejection. The flow now confirms first, then empties the folder
// before deleting it.

const FOLDER = {
  uuid: 'folder-1',
  type: 'FOLDER',
  name: 'Folder With Networks',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  attributes: {},
}

const NETWORK_IN_FOLDER = {
  uuid: 'net-inside',
  type: 'NETWORK',
  name: 'Network Inside',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  attributes: {},
}

test.describe('move a folder with networks to trash', () => {
  test('confirms, then empties the folder before deleting it', async ({
    page,
  }) => {
    const deletes = await mockFileTree(page, {
      home: [FOLDER],
      folders: { 'folder-1': [NETWORK_IN_FOLDER] },
      folderMeta: {
        'folder-1': { ...FOLDER, parent: '' },
      },
    })

    await page.goto('/my-account/')
    await expect(page.getByText('Folder With Networks')).toBeVisible()

    await page
      .getByRole('row', { name: /Folder With Networks/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Move to Trash').click()

    // The confirmation the issue asked for: names the consequence and the
    // retention window, and offers OK / Cancel.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Move folder to trash?')
    await expect(dialog).toContainText('and any contents')
    await expect(dialog).toContainText('30 days')

    await dialog.getByRole('button', { name: 'OK' }).click()

    // The network inside must be trashed first, or the folder delete 400s.
    await expect
      .poll(() => deletes.networks, { timeout: 15_000 })
      .toEqual(['net-inside'])
    await expect.poll(() => deletes.folders).toEqual(['folder-1'])

    // And the user is told it worked — the silent failure is gone.
    await expect(
      page.getByText('"Folder With Networks" moved to trash', { exact: true }),
    ).toBeVisible()
  })

  // The other half of GI-46: the delete rejection escaped as a floating
  // promise, so the user saw nothing at all and the busy state never cleared.
  test('reports a failure instead of failing silently', async ({ page }) => {
    const deletes = await mockFileTree(page, {
      home: [FOLDER],
      folders: { 'folder-1': [NETWORK_IN_FOLDER] },
      folderMeta: { 'folder-1': { ...FOLDER, parent: '' } },
      failNetworkDeletes: ['net-inside'],
    })

    await page.goto('/my-account/')
    await expect(page.getByText('Folder With Networks')).toBeVisible()

    await page
      .getByRole('row', { name: /Folder With Networks/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Move to Trash').click()
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click()

    // The user is told, rather than left guessing.
    await expect(
      page.getByText('"Folder With Networks" could not be moved to trash', {
        exact: true,
      }),
    ).toBeVisible()

    // The folder is left intact — never deleted behind a failed cascade.
    expect(deletes.folders).toEqual([])
    await expect(
      page.getByRole('row', { name: /Folder With Networks/ }),
    ).toBeVisible()

    // And the UI is still usable: the prompt closed and the page did not get
    // stuck in the busy state the old floating rejection left behind.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page
      .getByRole('row', { name: /Folder With Networks/ })
      .getByRole('button')
      .last()
      .click()
    await expect(
      page.getByRole('button', { name: 'Move to Trash' }),
    ).toBeVisible()
  })

  test('cancelling deletes nothing', async ({ page }) => {
    const deletes = await mockFileTree(page, {
      home: [FOLDER],
      folders: { 'folder-1': [NETWORK_IN_FOLDER] },
      folderMeta: { 'folder-1': { ...FOLDER, parent: '' } },
    })

    await page.goto('/my-account/')
    await expect(page.getByText('Folder With Networks')).toBeVisible()

    await page
      .getByRole('row', { name: /Folder With Networks/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Move to Trash').click()

    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Folder With Networks')).toBeVisible()
    expect(deletes).toEqual({ networks: [], folders: [], shortcuts: [] })
  })
})
