import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Network status utility functions for checking various network states
 */

/**
 * Check if network has error messages
 */
export const hasNetworkError = (network: FileItemBase): boolean => {
  const errorMessage = (network as any).errorMessage
  return errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== ''
}

/**
 * Check if network has warnings
 */
export const hasNetworkWarnings = (network: FileItemBase): boolean => {
  const warnings = (network as any).warnings
  return Array.isArray(warnings) && warnings.length > 0
}

/**
 * Check if network is valid
 */
export const isNetworkValid = (network: FileItemBase): boolean => {
  return Boolean((network as any).isValid)
}

/**
 * Check if network is read-only
 */
export const isNetworkReadOnly = (network: FileItemBase): boolean => {
  return Boolean((network as any).isReadOnly)
}

/**
 * Check if network has a valid DOI (not pending)
 */
export const hasValidDOI = (network: FileItemBase): boolean => {
  const doi = (network as any).doi
  return doi && typeof doi === 'string' && !doi.toLowerCase().startsWith('pending')
}
