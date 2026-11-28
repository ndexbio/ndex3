import { test, expect, mockTrash } from './fixtures/authenticated'

// Trashing a folder cascades — its contents land in the trash as separate,
// flat entries. Restoring the folder therefore has to bring the subtree back
// with it, or the folder returns empty. The user is told what is coming back
// and has to confirm.

const trashItem = (
  uuid: string,
  type: string,
  name: string,
  extra: Record<string, unknown> = {},
) => ({
  uuid,
  type,
  name,
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  attributes: {},
  ...extra,
})

test.describe('restore a folder from trash', () => {
  test('confirms, then restores the folder together with its contents', async ({
    page,
  }) => {
    // The listing carries parentage here, so no extra lookups are needed.
    const restores = await mockTrash(page, {
      items: [
        trashItem('folder-1', 'FOLDER', 'Trashed Folder', { parent: '' }),
        trashItem('net-1', 'NETWORK', 'Network One', { parent: 'folder-1' }),
        trashItem('sub-1', 'FOLDER', 'Sub Folder', { parent: 'folder-1' }),
        trashItem('net-2', 'NETWORK', 'Network Two', { parent: 'sub-1' }),
        trashItem('other', 'NETWORK', 'Unrelated Network', { parent: '' }),
      ],
    })

    await page.goto('/trash/')
    await expect(page.getByText('Trashed Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Trashed Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Restore', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Restore folder from trash?')
    await expect(dialog).toContainText('also restores its contents')
    // net-1, sub-1 and net-2 — but not the unrelated network.
    await expect(dialog).toContainText('3 items')

    await dialog.getByRole('button', { name: 'Restore' }).click()

    await expect.poll(() => restores.length, { timeout: 15_000 }).toBe(1)
    const [request] = restores
    expect(request.folders.sort()).toEqual(['folder-1', 'sub-1'])
    expect(request.networks.sort()).toEqual(['net-1', 'net-2'])
    // The item the user did not select must stay in the trash.
    expect([...request.folders, ...request.networks]).not.toContain('other')
  })

  test('looks up parentage when the trash listing does not carry it', async ({
    page,
  }) => {
    const restores = await mockTrash(page, {
      items: [
        trashItem('folder-1', 'FOLDER', 'Trashed Folder'),
        trashItem('net-1', 'NETWORK', 'Network One'),
      ],
      folderMeta: {
        'folder-1': { uuid: 'folder-1', name: 'Trashed Folder', parent: '' },
      },
      summaries: {
        'net-1': { externalId: 'net-1', parentDirUUID: 'folder-1' },
      },
    })

    await page.goto('/trash/')
    await expect(page.getByText('Trashed Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Trashed Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Restore', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('1 item will')

    await dialog.getByRole('button', { name: 'Restore' }).click()

    await expect.poll(() => restores.length, { timeout: 15_000 }).toBe(1)
    expect(restores[0].networks).toEqual(['net-1'])
    expect(restores[0].folders).toEqual(['folder-1'])
  })

  test('restores a plain network without a confirmation prompt', async ({
    page,
  }) => {
    const restores = await mockTrash(page, {
      items: [trashItem('net-1', 'NETWORK', 'Lonely Network', { parent: '' })],
    })

    await page.goto('/trash/')
    await expect(page.getByText('Lonely Network')).toBeVisible()

    await page
      .getByRole('row', { name: /Lonely Network/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Restore', { exact: true }).click()

    await expect.poll(() => restores.length, { timeout: 15_000 }).toBe(1)
    expect(restores[0].networks).toEqual(['net-1'])
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('cancelling restores nothing', async ({ page }) => {
    const restores = await mockTrash(page, {
      items: [
        trashItem('folder-1', 'FOLDER', 'Trashed Folder', { parent: '' }),
        trashItem('net-1', 'NETWORK', 'Network One', { parent: 'folder-1' }),
      ],
    })

    await page.goto('/trash/')
    await expect(page.getByText('Trashed Folder')).toBeVisible()

    await page
      .getByRole('row', { name: /Trashed Folder/ })
      .getByRole('button')
      .last()
      .click()
    await page.getByText('Restore', { exact: true }).click()

    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cancel' })
      .click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(restores).toEqual([])
  })
})
