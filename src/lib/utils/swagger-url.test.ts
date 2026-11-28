import { DEFAULT_SWAGGER_BASE_NAME, getSwaggerUrl } from './swagger-url'

describe('getSwaggerUrl', () => {
  it('falls back to the default path when swaggerBaseName is absent from config', () => {
    expect(getSwaggerUrl('www.ndexbio.org')).toBe(
      'https://www.ndexbio.org/rest/swagger/index.html',
    )
    expect(DEFAULT_SWAGGER_BASE_NAME).toBe('/rest/swagger/index.html')
  })

  it('falls back to the default path when swaggerBaseName is empty or blank', () => {
    expect(getSwaggerUrl('www.ndexbio.org', '')).toBe(
      'https://www.ndexbio.org/rest/swagger/index.html',
    )
    expect(getSwaggerUrl('www.ndexbio.org', '   ')).toBe(
      'https://www.ndexbio.org/rest/swagger/index.html',
    )
  })

  it('resolves an override path against the configured server', () => {
    expect(getSwaggerUrl('test.ndexbio.org', '/api/docs/index.html')).toBe(
      'https://test.ndexbio.org/api/docs/index.html',
    )
  })

  it('normalizes a leading slash on the override path', () => {
    expect(getSwaggerUrl('test.ndexbio.org', 'api/docs/index.html')).toBe(
      'https://test.ndexbio.org/api/docs/index.html',
    )
  })

  it('preserves an explicit protocol and strips a trailing slash on the server URL', () => {
    expect(getSwaggerUrl('http://localhost:8080/')).toBe(
      'http://localhost:8080/rest/swagger/index.html',
    )
  })

  // Documents the input contract: ndexBaseUrl is expected to be a host or origin,
  // so a base URL carrying a path keeps that path and has the swagger path appended.
  // A path-hosted server should be configured with a fully qualified swaggerBaseName,
  // since its swagger UI lives under the path rather than at the origin.
  it('appends to a base URL that carries a path component', () => {
    expect(getSwaggerUrl('http://localhost:8080/ndexbio-rest')).toBe(
      'http://localhost:8080/ndexbio-rest/rest/swagger/index.html',
    )
    expect(
      getSwaggerUrl(
        'http://localhost:8080/ndexbio-rest',
        'http://localhost:8080/ndexbio-rest/swagger/index.html',
      ),
    ).toBe('http://localhost:8080/ndexbio-rest/swagger/index.html')
  })

  it('uses a fully qualified override verbatim', () => {
    expect(
      getSwaggerUrl('www.ndexbio.org', 'https://docs.example.org/swagger/'),
    ).toBe('https://docs.example.org/swagger/')
  })
})
