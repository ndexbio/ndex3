import { render, screen, within } from '@testing-library/react'
import { Footer } from './Footer'

jest.mock('@/lib/contexts/ConfigContext', () => ({
  useBasePath: () => '',
}))

// Written out rather than imported so a wrong value in the component fails here.
const LEGAL_URL = 'https://ndexbio.github.io/legal/'

describe('Footer', () => {
  it('links the license, terms and privacy policy to the legal page on GitHub Pages', () => {
    render(<Footer />)

    const link = screen.getByRole('link', { name: 'License, Terms & Privacy Policy' })
    expect(link).toHaveAttribute('href', LEGAL_URL)
  })

  it('has no links to home.ndexbio.org, which is being retired', () => {
    const { container } = render(<Footer />)

    // By tag, not the contentinfo role: in the app the footer sits inside <main>,
    // where browsers don't give it that role (jsdom does).
    const footer = container.querySelector('footer') as HTMLElement
    const hrefs = within(footer)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toContain(LEGAL_URL)
    expect(hrefs.filter((href) => href?.includes('home.ndexbio.org'))).toEqual([])
  })
})
