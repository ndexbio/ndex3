import { test, expect, mockFileTree } from './fixtures/authenticated'

// A network is locked from the moment a DOI request is filed — including one
// stuck by a failed mint. The server refuses property edits, deletion, removal
// of the read-only flag and visibility changes; the UI must not offer them.

const base = {
  type: 'NETWORK',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  isReadOnly: true,
  attributes: {},
}

const PRE_CERTIFIED = {
  ...base,
  uuid: 'net-precert',
  name: 'Pre-certified Network',
  doi: '10.18119/N9PRECERT',
  isCertified: false,
}

const CERTIFIED = {
  ...base,
  uuid: 'net-certified',
  name: 'Certified Network',
  doi: '10.18119/N9CERT',
  isCertified: true,
}

const STUCK = {
  ...base,
  uuid: 'net-stuck',
  name: 'Stuck Network',
  doi: 'Pending',
  isCertified: false,
}

// A "certify now" request whose mint failed: the server sets certified before
// minting and never clears it, so the flag outlives the DOI.
const FAILED_CERTIFY = {
  ...base,
  uuid: 'net-failed-certify',
  name: 'Failed Certify Network',
  doi: 'Pending',
  isCertified: true,
}

const PLAIN_READONLY = {
  ...base,
  uuid: 'net-plain',
  name: 'Plain Readonly Network',
}

const openRowMenu = async (page: import('@playwright/test').Page, name: string) => {
  await page.getByRole('row', { name: new RegExp(name) }).getByRole('button').last().click()
}

test.describe('a network with a DOI is locked', () => {
  for (const network of [PRE_CERTIFIED, CERTIFIED, STUCK, FAILED_CERTIFY]) {
    test(`${network.name}: every locking action is refused`, async ({ page }) => {
      await mockFileTree(page, { home: [network] })

      await page.goto('/my-account/')
      await openRowMenu(page, network.name)

      await expect(page.getByRole('button', { name: 'Remove Read-only' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Edit Properties' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Move to Trash' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Request DOI' })).toBeDisabled()
    })
  }

  // Read-only by choice remains undoable — only a DOI freezes the flag.
  test('a plain read-only network can still be unlocked', async ({ page }) => {
    await mockFileTree(page, { home: [PLAIN_READONLY] })

    await page.goto('/my-account/')
    await openRowMenu(page, PLAIN_READONLY.name)

    await expect(page.getByRole('button', { name: 'Remove Read-only' })).toBeEnabled()
  })
})

test.describe('status icons', () => {
  test('certified shows the trophy; pre-certified does not', async ({ page }) => {
    await mockFileTree(page, { home: [CERTIFIED, PRE_CERTIFIED] })
    await page.goto('/my-account/')

    await expect(page.getByTitle('Published network with DOI')).toHaveCount(1)
    await expect(
      page.getByTitle('Locked — DOI requested, reference not yet added'),
    ).toHaveCount(1)
  })

  test('a failed certify-now mint never claims publication', async ({ page }) => {
    await mockFileTree(page, { home: [FAILED_CERTIFY] })
    await page.goto('/my-account/')

    await expect(
      page.getByTitle('DOI request failed — cancel the request and try again'),
    ).toBeVisible()
    await expect(page.getByTitle('Published network with DOI')).toHaveCount(0)
  })

  test('a failed mint is not shown as a plain read-only network', async ({ page }) => {
    await mockFileTree(page, { home: [STUCK] })
    await page.goto('/my-account/')

    await expect(
      page.getByTitle('DOI request failed — cancel the request and try again'),
    ).toBeVisible()
    await expect(page.getByTitle('Read-only network')).toHaveCount(0)
  })
})

test.describe('sharing a network with a DOI', () => {
  // Visibility is frozen because a minted DOI's URL is registered once and never
  // updated — but sharing with people must keep working.
  test('offers sharing but freezes visibility', async ({ page }) => {
    await mockFileTree(page, { home: [CERTIFIED] })
    await page.route('**/v3/files/sharing/members/list', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )

    await page.goto('/my-account/')
    await openRowMenu(page, CERTIFIED.name)
    await page.getByText('Share', { exact: true }).click()

    // ShareDialog has no role="dialog", so these are page-scoped.
    await expect(page.getByText(/visibility can't be changed/i)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Private' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Public' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: 'Unlisted' })).toBeDisabled()
  })

  test('leaves visibility editable on a network without a DOI', async ({ page }) => {
    await mockFileTree(page, { home: [PLAIN_READONLY] })
    await page.route('**/v3/files/sharing/members/list', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )

    await page.goto('/my-account/')
    await openRowMenu(page, PLAIN_READONLY.name)
    await page.getByText('Share', { exact: true }).click()

    await expect(page.getByRole('radio', { name: 'Public' })).toBeEnabled()
  })
})
