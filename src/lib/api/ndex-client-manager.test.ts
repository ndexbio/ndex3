import { getNdexClient } from './ndex-client-manager'

// The client is a shared module-level singleton. `getConfig().auth` is the
// config that drives the Authorization header (via HTTPService.getAuthHeaders),
// so asserting it reflects what the client actually sends. Each test uses a
// distinct base URL so it starts from a fresh client instance.
describe('getNdexClient', () => {
  it('attaches oauth auth when a token is provided', () => {
    const client = getNdexClient('a.ndexbio.org', 'my-token')
    expect(client.getConfig().auth).toEqual({
      type: 'oauth',
      idToken: 'my-token',
    })
  })

  it('keeps a previously-set token when later called without one (must not wipe the shared singleton)', () => {
    // Same base URL → same singleton instance.
    const authed = getNdexClient('b.ndexbio.org', 'my-token')
    expect(authed.getConfig().auth).toEqual({ type: 'oauth', idToken: 'my-token' })

    // A tokenless data call (e.g. public search) must NOT strip the token that a
    // concurrent authenticated request relies on. The client must still send the
    // Authorization header, i.e. auth stays configured with the same token.
    const anonymous = getNdexClient('b.ndexbio.org')
    expect(anonymous.getConfig().auth).toEqual({ type: 'oauth', idToken: 'my-token' })
  })

  it('keeps a previously-set token when later called with an empty-string token', () => {
    getNdexClient('c.ndexbio.org', 'my-token')
    // Unauthenticated callers pass token '' (Keycloak's default state); that must
    // be a no-op, not a wipe, for the same reason as the tokenless case.
    const client = getNdexClient('c.ndexbio.org', '')
    expect(client.getConfig().auth).toEqual({ type: 'oauth', idToken: 'my-token' })
  })

  it('replaces the token when a new one is provided', () => {
    getNdexClient('d.ndexbio.org', 'first')
    const client = getNdexClient('d.ndexbio.org', 'second')
    expect(client.getConfig().auth).toEqual({ type: 'oauth', idToken: 'second' })
  })

  it('starts anonymous when no token is ever provided', () => {
    const client = getNdexClient('e.ndexbio.org')
    expect(client.getConfig().auth).toBeUndefined()
  })

  it('prefixes https:// when the configured URL has no protocol', () => {
    const client = getNdexClient('f.ndexbio.org')
    expect(client.getConfig().baseURL).toBe('https://f.ndexbio.org')
  })
})
