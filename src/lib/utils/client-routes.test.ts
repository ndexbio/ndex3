import { classifyClientRoute, stripBasePath } from './client-routes'

describe('stripBasePath', () => {
  it('returns the path unchanged when no base path is configured', () => {
    expect(stripBasePath('/folders/abc')).toBe('/folders/abc')
    expect(stripBasePath('/folders/abc', '')).toBe('/folders/abc')
  })

  it('removes a configured base path', () => {
    expect(stripBasePath('/ndex3/folders/abc', '/ndex3')).toBe('/folders/abc')
  })

  it('the base path on its own becomes the root', () => {
    expect(stripBasePath('/ndex3', '/ndex3')).toBe('/')
  })

  it('leaves a path that does not start with the base path alone', () => {
    expect(stripBasePath('/folders/abc', '/ndex3')).toBe('/folders/abc')
  })

  // Stripping on a bare prefix match would mangle a sibling that merely shares
  // the first characters — "/ndex30/missing" would become "0/missing", and that
  // corrupted value is what gets reported to the metrics endpoint.
  it('leaves a lookalike sibling path intact', () => {
    expect(stripBasePath('/ndex30/missing', '/ndex3')).toBe('/ndex30/missing')
    expect(stripBasePath('/ndex3-other/x', '/ndex3')).toBe('/ndex3-other/x')
  })
})

describe('classifyClientRoute', () => {
  it('/ -> home', () => {
    expect(classifyClientRoute('/')).toEqual({ kind: 'home' })
  })

  it('/folders/{uuid} -> folder, with and without a trailing slash', () => {
    expect(classifyClientRoute('/folders/abc-123')).toEqual({
      kind: 'folder',
      uuid: 'abc-123',
    })
    expect(classifyClientRoute('/folders/abc-123/')).toEqual({
      kind: 'folder',
      uuid: 'abc-123',
    })
  })

  it('/users/{uuid} -> user, with and without a trailing slash', () => {
    expect(classifyClientRoute('/users/u-1')).toEqual({ kind: 'user', uuid: 'u-1' })
    expect(classifyClientRoute('/users/u-1/')).toEqual({ kind: 'user', uuid: 'u-1' })
  })

  it('/networkset/{uuid} -> networkset (the caller canonicalizes it)', () => {
    expect(classifyClientRoute('/networkset/legacy-uuid/')).toEqual({
      kind: 'networkset',
      uuid: 'legacy-uuid',
    })
  })

  // The prerender stub from generateStaticParams is not a real resource, so it
  // must not be reported as a missing folder or user.
  it('the placeholder uuid -> home, not unknown', () => {
    expect(classifyClientRoute('/folders/placeholder/')).toEqual({ kind: 'home' })
    expect(classifyClientRoute('/users/placeholder/')).toEqual({ kind: 'home' })
  })

  it('a wholly unrecognized path -> unknown', () => {
    expect(classifyClientRoute('/doesnotexist')).toEqual({ kind: 'unknown' })
    expect(classifyClientRoute('/doesnotexist/')).toEqual({ kind: 'unknown' })
  })

  // The regression that motivated extracting this: a known prefix with the
  // wrong shape used to fall through to the home page.
  it('a known prefix with too many segments -> unknown', () => {
    expect(classifyClientRoute('/users/abc/extra/')).toEqual({ kind: 'unknown' })
    expect(classifyClientRoute('/folders/abc/extra/')).toEqual({ kind: 'unknown' })
  })

  it('a known prefix with no uuid at all -> unknown', () => {
    expect(classifyClientRoute('/folders/')).toEqual({ kind: 'unknown' })
    expect(classifyClientRoute('/users')).toEqual({ kind: 'unknown' })
  })
})
