import { test, expect, mockFileTree } from './fixtures/authenticated'

// Requesting a DOI mints synchronously and locks the network — permanently when
// the "reference later" checkbox is left unticked. These cover the guards around
// that: confirmation before anything is sent, the required metadata, and the
// read-only dance needed to save that metadata first.

const NETWORK = {
  uuid: 'net-1',
  type: 'NETWORK',
  name: 'Requestable Network',
  owner: 'testuser',
  ownerUUID: 'user-uuid-1',
  modificationTime: 1700000000000,
  attributes: {},
}

interface Calls {
  doiRequests: any[]
  summaryUpdates: any[]
  readOnly: boolean[]
}

/**
 * Mocks everything the request flow touches.
 *
 * @param opts.rightsHolder  omit to simulate a network missing that property
 * @param opts.isReadOnly    the network summary's read-only state
 * @param opts.failRequest   reject the DOI request, to exercise recovery
 */
async function mockRequestFlow(
  page: import('@playwright/test').Page,
  opts: { rightsHolder?: string; isReadOnly?: boolean; failRequest?: boolean } = {},
) {
  const { rightsHolder = 'The Regents', isReadOnly = false, failRequest = false } = opts
  const calls: Calls = { doiRequests: [], summaryUpdates: [], readOnly: [] }

  await page.route('**/v3/networks/*/summary**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        externalId: NETWORK.uuid,
        name: NETWORK.name,
        description: 'A description',
        isReadOnly,
        properties: {
          version: { t: 'string', v: '1.0' },
          author: { t: 'string', v: 'Alice' },
          rights: { t: 'string', v: 'Attribution 4.0 International (CC BY 4.0)' },
          ...(rightsHolder ? { rightsHolder: { t: 'string', v: rightsHolder } } : {}),
        },
      }),
    }),
  )

  await page.route('**/v2/network/*/systemproperty', async (route) => {
    calls.readOnly.push(route.request().postDataJSON()?.readOnly)
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.route('**/v2/network/*/summary', async (route) => {
    calls.summaryUpdates.push(route.request().postDataJSON())
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.route('**/v2/admin/request', async (route) => {
    calls.doiRequests.push(route.request().postDataJSON())
    if (failRequest) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'DOI service unavailable' }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return calls
}

const openRequestDialog = async (page: import('@playwright/test').Page) => {
  await page.goto('/my-account/')
  await expect(page.getByText(NETWORK.name)).toBeVisible()
  await page
    .getByRole('row', { name: new RegExp(NETWORK.name) })
    .getByRole('button')
    .last()
    .click()
  await page.getByText('Request DOI').click()
  await expect(page.getByRole('dialog', { name: 'Request DOI' })).toBeVisible()
}

const fillEmail = (page: import('@playwright/test').Page) =>
  page.getByPlaceholder(/email/i).fill('alice@example.com')

const submit = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'SAVE AND REQUEST DOI' }).click()

test.describe('requesting a DOI is confirmed first', () => {
  test('certifying now warns that it is public and permanent', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page)

    await openRequestDialog(page)
    await fillEmail(page)
    await submit(page)

    const confirm = page.getByRole('dialog', { name: 'Publish and lock this network?' })
    await expect(confirm).toContainText('publicly visible')
    await expect(confirm).toContainText('permanently')
    // Nothing has been sent yet.
    expect(calls.doiRequests).toEqual([])

    await confirm.getByRole('button', { name: 'Publish and Lock' }).click()

    await expect.poll(() => calls.doiRequests.length, { timeout: 15_000 }).toBe(1)
    expect(calls.doiRequests[0]).toMatchObject({ type: 'DOI', isCertified: true })
  })

  test('deferring the reference describes a different outcome', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page)

    await openRequestDialog(page)
    await fillEmail(page)
    await page.getByLabel(/add\/modify the reference later/i).check()
    await submit(page)

    const confirm = page.getByRole('dialog', { name: 'Request a DOI?' })
    await expect(confirm).toContainText('keeping its current visibility')

    await confirm.getByRole('button', { name: 'Request DOI' }).click()

    await expect.poll(() => calls.doiRequests.length, { timeout: 15_000 }).toBe(1)
    // Inverted on the wire: ticking the box asks the server NOT to certify.
    expect(calls.doiRequests[0]).toMatchObject({ isCertified: false })
  })

  test('going back sends nothing and keeps the form', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page)

    await openRequestDialog(page)
    await fillEmail(page)
    await submit(page)
    await page.getByRole('button', { name: 'Go Back' }).click()

    expect(calls.doiRequests).toEqual([])
    await expect(page.getByRole('dialog', { name: 'Request DOI' })).toBeVisible()
  })
})

test.describe('required metadata', () => {
  // Submission is blocked before any validation message can appear, so the
  // asterisk beside the label is the only cue the user gets.
  test('rights holder is visibly marked as required', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    await mockRequestFlow(page, { rightsHolder: '' })

    await openRequestDialog(page)

    await expect(
      page.locator('label').filter({ hasText: 'Rights Holder' }),
    ).toContainText('*')
  })

  test('a missing rights holder blocks the request', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page, { rightsHolder: '' })

    await openRequestDialog(page)
    await fillEmail(page)

    await expect(page.getByRole('button', { name: 'SAVE AND REQUEST DOI' })).toBeDisabled()
    expect(calls.doiRequests).toEqual([])
  })
})

test.describe('a read-only network', () => {
  // The server refuses metadata updates on a read-only network, so the flow has
  // to unlock it before saving and put the flag back if the request fails.
  const editThenRequest = async (page: import('@playwright/test').Page) => {
    await openRequestDialog(page)
    await page.locator(`input[value="${NETWORK.name}"]`).fill('A renamed network')
    await fillEmail(page)
    await submit(page)
    await page.getByRole('button', { name: 'Publish and Lock' }).click()
  }

  test('is unlocked before its metadata is saved', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page, { isReadOnly: true })

    await editThenRequest(page)

    await expect.poll(() => calls.doiRequests.length, { timeout: 15_000 }).toBe(1)
    expect(calls.readOnly).toContain(false)
    expect(calls.summaryUpdates).toHaveLength(1)
  })

  test('has read-only restored when the request fails', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page, { isReadOnly: true, failRequest: true })

    await editThenRequest(page)

    // Cleared to save, then put back — the network must not be left editable.
    await expect.poll(() => calls.readOnly, { timeout: 15_000 }).toEqual([false, true])
    await expect(page.getByText('DOI Request Failed', { exact: true })).toBeVisible()
  })

  test('is left alone when there is no metadata to save', async ({ page }) => {
    await mockFileTree(page, { home: [NETWORK] })
    const calls = await mockRequestFlow(page, { isReadOnly: true })

    await openRequestDialog(page)
    await fillEmail(page)
    await submit(page)
    await page.getByRole('button', { name: 'Publish and Lock' }).click()

    await expect.poll(() => calls.doiRequests.length, { timeout: 15_000 }).toBe(1)
    expect(calls.readOnly).toEqual([])
    expect(calls.summaryUpdates).toEqual([])
  })
})
