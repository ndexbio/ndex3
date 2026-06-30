import { test, expect } from '@playwright/test'
import { mockFileSearchPaginated } from './fixtures/search-results'

const PAGE1 = [
  { uuid: 'p1-a', type: 'NETWORK', name: 'Alpha Network', visibility: 'PUBLIC', owner: 'alice', attributes: {} },
  { uuid: 'p1-b', type: 'NETWORK', name: 'Bravo Network', visibility: 'PUBLIC', owner: 'bob', attributes: {} },
  { uuid: 'p1-c', type: 'NETWORK', name: 'Charlie Network', visibility: 'PUBLIC', owner: 'carol', attributes: {} },
]

const PAGE2 = [
  { uuid: 'p2-a', type: 'NETWORK', name: 'Delta Network', visibility: 'PUBLIC', owner: 'dave', attributes: {} },
  { uuid: 'p2-b', type: 'NETWORK', name: 'Echo Network', visibility: 'PUBLIC', owner: 'erin', attributes: {} },
]

test.describe('search results — pagination (anonymous)', () => {
  test.beforeEach(async ({ page }) => {
    await mockFileSearchPaginated(page, { page1: PAGE1, page2: PAGE2, numFound: 600 })
    await page.goto('/search?q=test')
  })

  test('shows results and a Load more button when numFound exceeds the page size', async ({ page }) => {
    await expect(page.getByText('Alpha Network', { exact: true })).toBeVisible()
    await expect(page.getByText('Charlie Network', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /load more results/i })).toBeVisible()
  })

  test('clicking Load more appends the next page and hides the button when exhausted', async ({ page }) => {
    await page.getByRole('button', { name: /load more results/i }).click()

    await expect(page.getByText('Delta Network', { exact: true })).toBeVisible()
    await expect(page.getByText('Echo Network', { exact: true })).toBeVisible()
    await expect(page.getByText('Alpha Network', { exact: true })).toBeVisible()

    await expect(page.getByRole('button', { name: /load more results/i })).toHaveCount(0)
  })
  test('no Load more button when numFound fits in one page', async ({ page }) => {
      // numFound <= 500 means hasMore is false from the start. This is the
      // direct guard on the hasMore = size*500 < numFound boundary.
      await mockFileSearchPaginated(page, { page1: PAGE1, page2: [], numFound: 3 })
      await page.goto('/search?q=test')

      await expect(page.getByText('Alpha Network', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /load more results/i })).toHaveCount(0)
    })
})