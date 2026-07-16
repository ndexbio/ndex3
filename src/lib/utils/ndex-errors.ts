import { NDExAuthError, NDExNotFoundError } from '@js4cytoscape/ndex-client'

/**
 * Type guards for errors thrown by the NDEx client.
 *
 * Guards check both the class (instanceof) and the duck-typed shape
 * (statusCode / name), because errors that cross bundle boundaries or get
 * re-wrapped can lose their prototype chain.
 */

interface NDExErrorShape {
  statusCode?: number
  name?: string
}

const shapeOf = (error: unknown): NDExErrorShape =>
  (error ?? {}) as NDExErrorShape

/**
 * True when the server denied access (401 Unauthorized / 403 Forbidden).
 * For folder viewing this is an expected state (private resource), not a bug.
 */
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof NDExAuthError) return true
  const e = shapeOf(error)
  return e.statusCode === 401 || e.statusCode === 403 || e.name === 'NDExAuthError'
}

/** True when the resource does not exist (404 Not Found). */
export const isNotFoundError = (error: unknown): boolean => {
  if (error instanceof NDExNotFoundError) return true
  const e = shapeOf(error)
  return e.statusCode === 404 || e.name === 'NDExNotFoundError'
}

/**
 * Expected, user-facing view errors (permission denied / not found) that the
 * UI renders as a friendly state. Callers should not console.error these.
 */
export const isExpectedViewError = (error: unknown): boolean =>
  isAuthError(error) || isNotFoundError(error)
