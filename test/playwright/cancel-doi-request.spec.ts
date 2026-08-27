import { test, expect, mockFileTree } from './fixtures/authenticated'

// DOIs mint synchronously. When minting fails — no author property, a private
// network with no access key, or the DOI service being unreachable — the server
// leaves the network read-only with its DOI stuck at the literal string
// "Pending" rather than rolling back, and refuses any further request.
// Cancelling is the only way out.

const STUCK = {
  uuid: 'net-stuck',
  type: 'NETWORK',
  name: 'Stuck Network',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  doi: 'Pending',
  isCertified: false,
  isReadOnly: true,
  attributes: {},
}

const MINTED = {
  ...STUCK,
  uuid: 'net-minted',
  name: 'Minted Network',
  doi: '10.18119/N9TEST',
}

/** Records the Cancel_DOI posts, and lets a test reject one. */
async function mockAdminRequest(
  page: import('@playwright/test').Page,
  opts: { failWith?: { status: number; message: string } } = {},
) {
  const posts: unknown[] = []

  await page.route('**/v2/admin/request', async (route) => {
    posts.push(route.request().postDataJSON())

    if (opts.failWith) {
      return route.fulfill({
        status: opts.failWith.status,
        contentType: 'application/json',
        body: JSON.stringify({
          errorCode: 'NDEx_Forbidden_Operation',
          message: opts.failWith.message,
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return posts
}

const openRowMenu = async (page: import('@playwright/test').Page, name: string) => {
  await page.getByRole('row', { name: new RegExp(name) }).getByRole('button').last().click()
}

test.describe('cancel a DOI request that failed to mint', () => {
  test('clears the request and reports the network editable again', async ({ page }) => {
    await mockFileTree(page, { home: [STUCK] })
    const posts = await mockAdminRequest(page)

    await page.goto('/my-account/')
    await expect(page.getByText('Stuck Network')).toBeVisible()

    // The row says the request failed, rather than looking like a plain
    // read-only network the user could simply unlock.
    await expect(
      page.getByTitle('DOI request failed — cancel the request and try again'),
    ).toBeVisible()

    await openRowMenu(page, 'Stuck Network')
    await page.getByText('Cancel DOI Request').click()

    const dialog = page.getByRole('dialog', { name: 'Cancel DOI request?' })
    await expect(dialog).toContainText('Stuck Network')
    await expect(dialog).toContainText('editable again')
    expect(posts).toEqual([])

    await dialog.getByRole('button', { name: 'Cancel Request' }).click()

    await expect.poll(() => posts.length, { timeout: 15_000 }).toBe(1)
    expect(posts[0]).toEqual({ type: 'Cancel_DOI', networkId: 'net-stuck' })

    await expect(
      page.getByText('"Stuck Network" is editable again. You can request a DOI once the problem is fixed.', {
        exact: true,
      }),
    ).toBeVisible()
  })

  test('backing out sends nothing', async ({ page }) => {
    await mockFileTree(page, { home: [STUCK] })
    const posts = await mockAdminRequest(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Stuck Network')
    await page.getByText('Cancel DOI Request').click()
    await page
      .getByRole('dialog', { name: 'Cancel DOI request?' })
      .getByRole('button', { name: 'Keep Request' })
      .click()

    expect(posts).toEqual([])
  })

  test("surfaces the server's refusal instead of claiming success", async ({ page }) => {
    await mockFileTree(page, { home: [STUCK] })
    await mockAdminRequest(page, {
      failWith: { status: 403, message: 'Only pending DOI request can be cancelled.' },
    })

    await page.goto('/my-account/')
    await openRowMenu(page, 'Stuck Network')
    await page.getByText('Cancel DOI Request').click()
    await page
      .getByRole('dialog', { name: 'Cancel DOI request?' })
      .getByRole('button', { name: 'Cancel Request' })
      .click()

    await expect(
      page.getByText('Unable to Cancel DOI Request', { exact: true }),
    ).toBeVisible()
  })
})

test.describe('Cancel is offered only for a failed mint', () => {
  test('a successfully minted DOI cannot be cancelled', async ({ page }) => {
    await mockFileTree(page, { home: [MINTED] })
    await mockAdminRequest(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Minted Network')

    await expect(page.getByText('Cancel DOI Request')).toHaveCount(0)
    // It is pre-certified instead, so the reference can still be added.
    await expect(page.getByText('Add Reference')).toBeVisible()
  })

  test('a stuck network is not offered Add Reference', async ({ page }) => {
    // Adding a reference would certify it and publish it with a DOI field
    // reading "Pending" that never resolves.
    await mockFileTree(page, { home: [STUCK] })
    await mockAdminRequest(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Stuck Network')

    await expect(page.getByText('Add Reference')).toHaveCount(0)
    await expect(page.getByText('Cancel DOI Request')).toBeVisible()
  })

  test('Request DOI stays blocked while a network is stuck', async ({ page }) => {
    await mockFileTree(page, { home: [STUCK] })
    await mockAdminRequest(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Stuck Network')

    await expect(page.getByRole('button', { name: 'Request DOI' })).toBeDisabled()
  })
})
