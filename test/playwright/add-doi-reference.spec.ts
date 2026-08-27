import { test, expect, mockFileTree } from './fixtures/authenticated'

// Ticking "Let me add/modify the reference later." when requesting a DOI leaves
// the network pre-certified: the request is in, but the reference is still
// missing. This is the second half of that flow — supplying the reference,
// which is what certifies the network.

// A minted DOI on a network that has not been certified. A DOI stuck at
// "Pending" is a failed mint, not this state — see cancel-doi-request.spec.ts.
const PRE_CERTIFIED = {
  uuid: 'net-precert',
  type: 'NETWORK',
  name: 'Pre-certified Network',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  doi: '10.18119/N9PRECERT',
  isCertified: false,
  attributes: {},
}

const CERTIFIED = {
  ...PRE_CERTIFIED,
  uuid: 'net-certified',
  name: 'Certified Network',
  doi: '10.18119/N9TEST',
  isCertified: true,
}

const PLAIN = {
  uuid: 'net-plain',
  type: 'NETWORK',
  name: 'Plain Network',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  attributes: {},
}

/** Records the reference PUTs the app makes, and lets a test reject one. */
async function mockReferenceEndpoint(
  page: import('@playwright/test').Page,
  opts: { failWith?: { status: number; message: string } } = {},
) {
  const puts: { networkId: string; body: unknown }[] = []

  await page.route('**/v3/networks/*/summary**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2) as string
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        externalId: id,
        name: id === PRE_CERTIFIED.uuid ? PRE_CERTIFIED.name : id,
        properties: {},
      }),
    })
  })

  await page.route('**/v2/network/*/reference', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2) as string
    puts.push({ networkId: id, body: route.request().postDataJSON() })

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

  return puts
}

const openRowMenu = async (page: import('@playwright/test').Page, name: string) => {
  await page.getByRole('row', { name: new RegExp(name) }).getByRole('button').last().click()
}

const typeReference = async (page: import('@playwright/test').Page, text: string) => {
  const editor = page.locator('#reference-editor [contenteditable="true"]')
  await editor.click()
  await editor.fill(text)
}

test.describe('add a reference to a pre-certified network', () => {
  test('sends the reference and reports the network as certified', async ({ page }) => {
    await mockFileTree(page, { home: [PRE_CERTIFIED] })
    const puts = await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await expect(page.getByText('Pre-certified Network')).toBeVisible()

    await openRowMenu(page, 'Pre-certified Network')
    await page.getByText('Add Reference').click()

    // The dialog spells out that this is a one-way door before anything is sent.
    const dialog = page.getByRole('dialog', { name: 'Add Reference' })
    await expect(dialog).toContainText('This cannot be undone.')
    await expect(dialog).toContainText('permanently locked')

    await typeReference(page, 'Pratt D, et al. NDEx, the Network Data Exchange.')
    await page.getByRole('button', { name: 'ADD REFERENCE' }).click()

    // ...and confirms again before the request goes out.
    const confirm = page.getByRole('dialog', { name: 'Certify this network?' })
    await expect(confirm).toContainText('Pre-certified Network')
    expect(puts).toEqual([])

    await confirm.getByRole('button', { name: 'Add Reference' }).click()

    await expect.poll(() => puts.length, { timeout: 15_000 }).toBe(1)
    expect(puts[0].networkId).toBe('net-precert')
    expect(puts[0].body).toMatchObject({
      reference: expect.stringContaining('NDEx, the Network Data Exchange'),
    })

    await expect(
      page.getByText('"Pre-certified Network" is now certified and publicly visible.', {
        exact: true,
      }),
    ).toBeVisible()
  })

  test('cancelling the confirmation sends nothing', async ({ page }) => {
    await mockFileTree(page, { home: [PRE_CERTIFIED] })
    const puts = await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Pre-certified Network')
    await page.getByText('Add Reference').click()

    await typeReference(page, 'Pratt D, et al.')
    await page.getByRole('button', { name: 'ADD REFERENCE' }).click()
    await page
      .getByRole('dialog', { name: 'Certify this network?' })
      .getByRole('button', { name: 'Cancel' })
      .click()

    expect(puts).toEqual([])
    // Back on the form, with the typed reference intact.
    await expect(page.getByRole('dialog', { name: 'Add Reference' })).toBeVisible()
  })

  test('an empty reference cannot be submitted', async ({ page }) => {
    await mockFileTree(page, { home: [PRE_CERTIFIED] })
    await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Pre-certified Network')
    await page.getByText('Add Reference').click()

    // The server 400s on a blank reference, so the button stays inert.
    await expect(page.getByRole('button', { name: 'ADD REFERENCE' })).toBeDisabled()
  })

  test("surfaces the server's refusal instead of claiming success", async ({ page }) => {
    await mockFileTree(page, { home: [PRE_CERTIFIED] })
    await mockReferenceEndpoint(page, {
      failWith: {
        status: 403,
        message: 'This network has already been certified, updating reference is not allowed.',
      },
    })

    await page.goto('/my-account/')
    await openRowMenu(page, 'Pre-certified Network')
    await page.getByText('Add Reference').click()

    await typeReference(page, 'Pratt D, et al.')
    await page.getByRole('button', { name: 'ADD REFERENCE' }).click()
    await page
      .getByRole('dialog', { name: 'Certify this network?' })
      .getByRole('button', { name: 'Add Reference' })
      .click()

    await expect(page.getByText('Unable to Add Reference', { exact: true })).toBeVisible()
    await expect(
      page.getByText('"Pre-certified Network" is now certified and publicly visible.', {
        exact: true,
      }),
    ).toHaveCount(0)
  })
})

test.describe('Add Reference is offered only where it applies', () => {
  test('a certified network gets no Add Reference', async ({ page }) => {
    await mockFileTree(page, { home: [CERTIFIED] })
    await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Certified Network')

    await expect(page.getByText('Add Reference')).toHaveCount(0)
  })

  test('a network with no DOI request gets no Add Reference', async ({ page }) => {
    await mockFileTree(page, { home: [PLAIN] })
    await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Plain Network')

    await expect(page.getByText('Add Reference')).toHaveCount(0)
    // Request DOI is still open to this network.
    await expect(page.getByText('Request DOI')).toBeVisible()
  })

  test('Request DOI is blocked once a DOI exists', async ({ page }) => {
    await mockFileTree(page, { home: [PRE_CERTIFIED] })
    await mockReferenceEndpoint(page)

    await page.goto('/my-account/')
    await openRowMenu(page, 'Pre-certified Network')

    await expect(
      page.getByRole('button', { name: 'Request DOI' }),
    ).toBeDisabled()
  })
})
