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

  test('unchecking Folders removes the folder but keeps networks', async ({ page }) => {
      // Guards against type-filter logic regressing for non-network types
      await page.getByTestId('filter-type-folders').click()

      await expect(page.getByText(/2 of 3 results/i)).toBeVisible()
      await expect(page.getByText('Public Folder')).toHaveCount(0)
      await expect(page.getByText('Public Network One', { exact: true })).toBeVisible()
    })

    test('re-checking a filter restores the hidden items', async ({ page }) => {
      // Guards against toggle being one-way (off works, on silently doesn't)
      await page.getByTestId('filter-type-networks').click()
      await expect(page.getByText(/1 of 3 results/i)).toBeVisible()

      await page.getByTestId('filter-type-networks').click()
      await expect(page.getByText(/3 of 3 results/i)).toBeVisible()
      await expect(page.getByText('Public Network One', { exact: true })).toBeVisible()
    })

    test('Reset button is absent at defaults and appears only after a change', async ({ page }) => {
      // Guards against hasActiveFilters logic regressing
      await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0)
      await page.getByTestId('filter-type-networks').click()
      await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
    })
})