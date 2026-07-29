/**
 * Utility for resolving the Swagger / OpenAPI UI URL for the configured NDEx server.
 *
 * The path portion is configurable via the optional `swaggerBaseName` key in
 * `public/config.json`, so instances that host Swagger somewhere other than the
 * default can point at it without a code change.
 */

/** Path to the Swagger UI on a standard NDEx server deployment */
export const DEFAULT_SWAGGER_BASE_NAME = '/rest/swagger/index.html'

/**
 * Builds the Swagger UI URL for the configured NDEx server.
 *
 * @param ndexBaseUrl - Server host from config (with or without protocol)
 * @param swaggerBaseName - Optional override; either a path (`/rest/swagger/index.html`)
 *                          or a fully qualified URL, which is used as-is
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
