/**
 * Utility for resolving the Swagger / OpenAPI UI URL for the configured NDEx server.
 *
 * The path portion is configurable via the optional `swaggerBaseName` key in
 * `public/config.json`, so instances that host Swagger somewhere other than the
 * default can point at it without a code change. That key is absent from the
 * shipped config, so the default `/rest/swagger/index.html` applies unless an
 * instance opts in.
 *
 * `ndexBaseUrl` is expected to be a host or origin with no path component
 * (`www.ndexbio.org`, `https://dev1.ndexbio.org`), which is what every NDEx config
 * supplies. The swagger path is appended to whatever it is given, so an instance
 * served under a path should set `swaggerBaseName` to a fully qualified URL rather
 * than a path — the swagger UI of a path-hosted server lives under that path, not
 * at the server's origin.
 */

/**
 * Path to the Swagger UI on a standard NDEx server deployment. Used whenever
 * `swaggerBaseName` is missing or blank in `public/config.json`.
 */
export const DEFAULT_SWAGGER_BASE_NAME = '/rest/swagger/index.html'

/**
 * Builds the Swagger UI URL for the configured NDEx server.
 *
 * @param ndexBaseUrl - Server host or origin from config (with or without protocol,
 *                      without a path component)
 * @param swaggerBaseName - Optional override; either a path appended to the server
 *                          or a fully qualified URL, which is used as-is. When
 *                          omitted or blank, {@link DEFAULT_SWAGGER_BASE_NAME}
 *                          (`/rest/swagger/index.html`) is used.
 * @returns Absolute URL to the Swagger UI
 */
export const getSwaggerUrl = (
  ndexBaseUrl: string,
  swaggerBaseName?: string,
): string => {
  const path = swaggerBaseName?.trim() || DEFAULT_SWAGGER_BASE_NAME

  // A full URL override is used verbatim
  if (path.startsWith('http')) {
    return path
  }

  const host = ndexBaseUrl.startsWith('http')
    ? ndexBaseUrl
    : `https://${ndexBaseUrl}`
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${host.replace(/\/$/, '')}${normalizedPath}`
}
