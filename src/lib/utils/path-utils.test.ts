import { withBasePath } from './path-utils'

describe('withBasePath', () => {
  it('prefixes an app-relative path', () => {
    expect(withBasePath('/logo.svg', '/ndex3')).toBe('/ndex3/logo.svg')
  })

  it('adds a leading slash when the path lacks one', () => {
    expect(withBasePath('logo.svg', '/ndex3')).toBe('/ndex3/logo.svg')
  })

  it('returns the path unchanged when no base path is configured', () => {
    expect(withBasePath('/logo.svg', '')).toBe('/logo.svg')
  })

  it('leaves external URLs alone', () => {
    expect(withBasePath('https://example.org/logo.svg', '/ndex3')).toBe(
      'https://example.org/logo.svg',
    )
  })

  it('does not prefix a path that is already under the base path', () => {
    expect(withBasePath('/ndex3/logo.svg', '/ndex3')).toBe('/ndex3/logo.svg')
    expect(withBasePath('/ndex3', '/ndex3')).toBe('/ndex3')
  })

  // The "already prefixed" test needs a segment boundary. Without one, a
  // sibling path that merely shares the prefix is mistaken for an internal
  // one and left pointing outside the deployment.
  it('prefixes a lookalike sibling rather than mistaking it for an internal path', () => {
    expect(withBasePath('/ndex3-other/logo.svg', '/ndex3')).toBe(
      '/ndex3/ndex3-other/logo.svg',
    )
    expect(withBasePath('/ndex30/logo.svg', '/ndex3')).toBe(
      '/ndex3/ndex30/logo.svg',
    )
  })
})
