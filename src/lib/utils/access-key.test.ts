import { withAccessKey } from './access-key'

describe('withAccessKey', () => {
  it('leaves the URL unchanged when no access key is present', () => {
    expect(withAccessKey('/folders/f-1')).toBe('/folders/f-1')
  })

  it('adds and encodes an access key', () => {
    expect(withAccessKey('/viewer/networks/n-1', 'secret key/+')).toBe(
      '/viewer/networks/n-1?accesskey=secret%20key%2F%2B',
    )
  })

  it('preserves existing parameters and fragments', () => {
    expect(withAccessKey('https://web.example/0/networks/n-1?layout=grid#view', 'key')).toBe(
      'https://web.example/0/networks/n-1?layout=grid&accesskey=key#view',
    )
  })
})
