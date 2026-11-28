import { test, expect } from '@playwright/test'

/**
 * The footer's legal link, checked in the built static export.
 *
 * The legal page moved from home.ndexbio.org/disclaimer-license/ to GitHub
 * Pages as part of retiring home.ndexbio.org. Only the href is asserted:
 * following it would make this spec depend on an external site being up.
 *
 * The footer is found by tag, not by the `contentinfo` role: the layout renders
 * it inside `<main>`, where a `<footer>` is not a landmark.
 */
test('footer links the legal page on GitHub Pages, not home.ndexbio.org', async ({ page }) => {
  await page.goto('/')

  const footer = page.locator('footer')
  await expect(
    footer.getByRole('link', { name: 'License, Terms & Privacy Policy' }),
  ).toHaveAttribute('href', 'https://ndexbio.github.io/legal/')
  await expect(footer.locator('a[href*="home.ndexbio.org"]')).toHaveCount(0)
})
