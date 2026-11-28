import { test, expect, type Page } from '@playwright/test'

/**
 * FAQ answers link to the user guides inside NDEx3, not home.ndexbio.org.
 *
 * Runs against the built static export, so following a link exercises the real
 * client routing and the guide page it lands on.
 */

const GUIDES = [
  { question: 'How do I search for networks in NDEx?', link: 'Finding and Querying manual', path: '/docs/finding-and-querying', title: 'Finding and Querying Networks' },
  { question: 'How do I create an NDEx account?', link: 'Creating an Account', path: '/docs/create-an-ndex-account', title: 'Creating and Using an NDEx Account' },
  { question: 'How can I load my networks to NDEx?', link: 'Uploading and Sharing guide', path: '/docs/sharing-and-accessing', title: 'Uploading and Sharing Networks' },
  { question: 'Can I share my networks with collaborators?', link: 'Sharing guide', path: '/docs/sharing-and-accessing', title: 'Uploading and Sharing Networks' },
  { question: 'Can I have an account for my analysis pipelines?', link: "Developer's README", path: '/docs/developers-best-practices', title: 'Developing in NDEx' },
  { question: 'Can I request a DOI for my networks?', link: 'Publishing in NDEx guide', path: '/docs/publishing', title: 'Publishing in NDEx' },
]

/** The answer under a question, opened first if closed (only one shows at a time). */
async function openAnswer(page: Page, question: string) {
  const button = page.getByRole('button', { name: question, exact: true })
  const answer = button.locator('xpath=following-sibling::div[1]')
  if ((await answer.count()) === 0) await button.click()
  await expect(answer).toBeVisible()
  return answer
}

test('no FAQ answer links to home.ndexbio.org', async ({ page }) => {
  await page.goto('/faq/')

  const questions = await page.locator('main').getByRole('button').allTextContents()
  expect(questions).toEqual(expect.arrayContaining(GUIDES.map((g) => g.question)))

  const hrefs: string[] = []
  for (const question of questions) {
    const answer = await openAnswer(page, question)
    for (const a of await answer.getByRole('link').all()) hrefs.push((await a.getAttribute('href')) ?? '')
  }

  for (const { path } of GUIDES) expect(hrefs.some((h) => h.replace(/\/$/, '') === path)).toBe(true)
  expect(hrefs.filter((h) => h.includes('home.ndexbio.org'))).toEqual([])
})

for (const guide of GUIDES) {
  test(`"${guide.question}" opens ${guide.path} in the app`, async ({ page }) => {
    await page.goto('/faq/')

    const answer = await openAnswer(page, guide.question)
    await answer.getByRole('link', { name: guide.link, exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`${guide.path}/?$`))
    await expect(page.getByRole('heading', { level: 1, name: guide.title })).toBeVisible()
    await expect(page.getByTestId('page-not-found')).toHaveCount(0)
  })
}
