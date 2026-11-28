import fs from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import FAQPage from './page'

// Each answer that points to a user guide, and the in-app page it should open.
// Written out rather than read from the page, so a wrong href fails here.
const GUIDE_LINKS: Array<[question: string, linkText: string, href: string]> = [
  ['How do I search for networks in NDEx?', 'Finding and Querying manual', '/docs/finding-and-querying'],
  ['How do I create an NDEx account?', 'Creating an Account', '/docs/create-an-ndex-account'],
  ['How can I load my networks to NDEx?', 'Uploading and Sharing guide', '/docs/sharing-and-accessing'],
  ['Can I share my networks with collaborators?', 'Sharing guide', '/docs/sharing-and-accessing'],
  ['Can I have an account for my analysis pipelines?', "Developer's README", '/docs/developers-best-practices'],
  ['Can I request a DOI for my networks?', 'Publishing in NDEx guide', '/docs/publishing'],
]

/** The rendered answer under a question; opens it first if it is closed. */
function openAnswer(question: string): HTMLElement {
  const button = screen.getByRole('button', { name: question })
  if (!button.nextElementSibling) fireEvent.click(button)
  return button.nextElementSibling as HTMLElement
}

/** Opens every answer in turn (only one is shown at a time) and collects them. */
function readEveryAnswer() {
  render(<FAQPage />)
  return screen.getAllByRole('button').map((button) => {
    const answer = openAnswer(button.textContent ?? '')
    return {
      question: button.textContent ?? '',
      text: answer.textContent ?? '',
      hrefs: within(answer).queryAllByRole('link').map((a) => a.getAttribute('href') ?? ''),
    }
  })
}

describe('FAQ page', () => {
  it.each(GUIDE_LINKS)('"%s" links "%s" to the in-app guide %s', (question, linkText, href) => {
    render(<FAQPage />)

    const answer = openAnswer(question)
    expect(within(answer).getByRole('link', { name: linkText })).toHaveAttribute('href', href)
  })

  it('links to no home.ndexbio.org page from any answer', () => {
    const hrefs = readEveryAnswer().flatMap((a) => a.hrefs)

    for (const [, , href] of GUIDE_LINKS) expect(hrefs).toContain(href)
    expect(hrefs.filter((href) => href.includes('home.ndexbio.org'))).toEqual([])
  })

  it('points every /docs/ link at a page that exists in the app', () => {
    const docLinks = [...new Set(readEveryAnswer().flatMap((a) => a.hrefs))].filter((h) => h.startsWith('/docs/'))

    expect(docLinks.length).toBeGreaterThan(0)
    for (const href of docLinks) {
      expect({ href, exists: fs.existsSync(path.join(process.cwd(), 'src/app/(info)', href, 'page.tsx')) }).toEqual({
        href,
        exists: true,
      })
    }
  })

  it('no longer offers workgroups, which NDEx3 does not have', () => {
    const answers = readEveryAnswer()

    expect(answers.map((a) => a.question)).toContain('Can I share my networks with collaborators?')
    expect(answers.map((a) => a.question).filter((q) => /group/i.test(q))).toEqual([])
    expect(answers.filter((a) => /\bgroups?\b/i.test(a.text)).map((a) => a.question)).toEqual([])
  })
})
