import { test, expect } from '@playwright/test'
import { mockFileSearch, PUBLIC_ITEMS } from './fixtures/search-results'

test.describe('search results — type filters (anonymous)', () => {
  test.beforeEach(async ({ page }) => {
    await mockFileSearch(page, { publicItems: PUBLIC_ITEMS, privateItems: [] })
    await page.goto('/search?q=test')
  })

  test('shows all public items by default', async ({ page }) => {
    await expect(page.getByText(/3 of 3 results/i)).toBeVisible()
  })

  test('unchecking Networks hides networks and updates the count', async ({ page }) => {
    await page.getByTestId('filter-type-networks').click()

    await expect(page.getByText(/1 of 3 results/i)).toBeVisible()
    await expect(page.getByText('Public Folder')).toBeVisible()
    await expect(page.getByText('Public Network One')).toHaveCount(0)
  })

  test('unchecking all types shows the no-match empty state', async ({ page }) => {
    await page.getByTestId('filter-type-networks').click()
    await page.getByTestId('filter-type-folders').click()
    await page.getByTestId('filter-type-shortcuts').click()

    await expect(page.getByText(/No results match your filters/i)).toBeVisible()
  })

  test('Reset restores defaults', async ({ page }) => {
    await page.getByTestId('filter-type-networks').click()
    await expect(page.getByText(/1 of 3 results/i)).toBeVisible()

    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByText(/3 of 3 results/i)).toBeVisible()
  })
})here