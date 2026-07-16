import { getNdexClient } from './ndex-client-manager'

describe('getNdexClient', () => {
  const URL = 'test.ndexbio.org'

  it('attaches oauth auth when a token is provided', () => {
    const client = getNdexClient(URL, 'my-token')
    expect(client.getConfig().auth).toEqual({
      type: 'oauth',
      idToken: 'my-token',
    })
  })

  it('clears auth on a tokenless call after an authenticated one (singleton must not leak tokens)', () => {
    const authed = getNdexClient(URL, 'my-token')
    expect(authed.getConfig().auth).toBeDefined()

    // Same base URL → same singleton instance; the previous token must be gone
    const anonymous = getNdexClient(URL)
    expect(anonymous.getConfig().auth).toBeUndefined()
  })

  it('treats an empty-string token as anonymous', () => {
    getNdexClient(URL, 'my-token')
    const anonymous = getNdexClient(URL, '')
    expect(anonymous.getConfig().auth).toBeUndefined()
  })

  it('prefixes https:// when the configured URL has no protocol', () => {
    const client = getNdexClient(URL)
    expect(client.getConfig().baseURL).toBe(`https://${URL}`)
  })
})
