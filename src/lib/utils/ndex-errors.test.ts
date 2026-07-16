import { NDExAuthError, NDExNotFoundError, NDExServerError } from '@js4cytoscape/ndex-client'
import { isAuthError, isNotFoundError, isExpectedViewError } from './ndex-errors'

describe('ndex-errors guards', () => {
  describe('isAuthError', () => {
    it('matches NDExAuthError instances', () => {
      expect(isAuthError(new NDExAuthError('denied'))).toBe(true)
    })

    it.each([401, 403])('matches duck-typed statusCode %i', (statusCode) => {
      expect(isAuthError({ statusCode })).toBe(true)
    })

    it('matches duck-typed name when prototype chain is lost', () => {
      expect(isAuthError({ name: 'NDExAuthError' })).toBe(true)
    })

    it('rejects other errors and non-errors', () => {
      expect(isAuthError(new NDExServerError('boom'))).toBe(false)
      expect(isAuthError({ statusCode: 404 })).toBe(false)
      expect(isAuthError(null)).toBe(false)
      expect(isAuthError(undefined)).toBe(false)
      expect(isAuthError('401')).toBe(false)
    })
  })

  describe('isNotFoundError', () => {
    it('matches NDExNotFoundError instances', () => {
      expect(isNotFoundError(new NDExNotFoundError('missing'))).toBe(true)
    })

    it('matches duck-typed statusCode 404 and name', () => {
      expect(isNotFoundError({ statusCode: 404 })).toBe(true)
      expect(isNotFoundError({ name: 'NDExNotFoundError' })).toBe(true)
    })

    it('rejects auth errors and non-errors', () => {
      expect(isNotFoundError({ statusCode: 403 })).toBe(false)
      expect(isNotFoundError(null)).toBe(false)
    })
  })

  describe('isExpectedViewError', () => {
    it('accepts both auth and not-found errors', () => {
      expect(isExpectedViewError({ statusCode: 401 })).toBe(true)
      expect(isExpectedViewError({ statusCode: 404 })).toBe(true)
    })

    it('rejects server errors', () => {
      expect(isExpectedViewError({ statusCode: 500 })).toBe(false)
    })
  })
})
