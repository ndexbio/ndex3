import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Network status utility functions for checking various network states
 */

/**
 * Check if network has error messages
 */
export const hasNetworkError = (network: FileItemBase): boolean => {
  const errorMessage = network.errorMessage
  return Boolean(errorMessage && errorMessage.trim() !== '')
}

/**
 * Check if network has warnings
 */
export const hasNetworkWarnings = (network: FileItemBase): boolean => {
  return Array.isArray(network.warnings) && network.warnings.length > 0
}

/**
 * Check if network is valid
 */
export const isNetworkValid = (network: FileItemBase): boolean => {
  return Boolean(network.isValid)
}

/**
 * Check if network is read-only
 */
export const isNetworkReadOnly = (network: FileItemBase): boolean => {
  return Boolean(network.isReadOnly)
}

/**
 * Read the raw `doi` field, but only for networks.
 *
 * `doi` and `isCertified` exist on network summaries only, so folders and
 * shortcuts can never satisfy any of the DOI predicates below. Guarding here
 * rather than at each call site means a folder that somehow carried a stray
 * `doi` attribute still can't be mistaken for a published network.
 */
const networkDOI = (network: FileItemBase | null | undefined): string | null => {
  if (!network || network.type !== NDExFileType.NETWORK) return null
  const doi = network.doi
  return typeof doi === 'string' && doi.trim() !== '' ? doi : null
}

/**
 * True while a DOI has been requested but not yet assigned.
 *
 * Mirrors `isDOIPending` in the legacy AngularJS app (ui-misc.js), which is
 * still the source of truth for what the server puts in this field.
 */
export const isDOIPending = (network: FileItemBase | null | undefined): boolean => {
  const doi = networkDOI(network)
  return doi !== null && doi.toLowerCase().startsWith('pending')
}

/** True once a real DOI has been assigned (anything other than "pending"). */
export const isDOIAssigned = (network: FileItemBase | null | undefined): boolean => {
  const doi = networkDOI(network)
  return doi !== null && !doi.toLowerCase().startsWith('pending')
}

/**
 * True when the network has been certified: public, indexed, permanently locked.
 *
 * **The flag is only meaningful alongside a real, minted DOI**, so this requires
 * both. `requestDOI` sets `certified` *before* calling the minting service, and
 * the failure paths reset `doi` to "Pending" without ever clearing the flag — so
 * a "certify now" request whose mint failed is left as `doi: "Pending"` with
 * `isCertified: true`. Reading the flag on its own reports that network as
 * published, when in fact it has no resolvable DOI at all.
 */
export const isNetworkCertified = (network: FileItemBase | null | undefined): boolean =>
  isDOIAssigned(network) && network?.isCertified === true

/**
 * True for a network holding a real, minted DOI that has not been certified —
 * the one window in which a reference may still be added.
 *
 * Deliberately stricter than the server, which gates on `hasDOI && !isCertified`
 * where `hasDOI` is merely `ndexdoi is not null`. That also matches a network
 * stuck at "Pending" after a failed mint, and adding a reference to one of those
 * would certify it and make it public with a DOI field that reads "Pending" and
 * never resolves. A failed mint is not a window to add a reference; it is a
 * failure to cancel and retry.
 */
export const isPreCertified = (network: FileItemBase | null | undefined): boolean =>
  isDOIAssigned(network) && !isNetworkCertified(network)

/**
 * True for a network carrying any DOI at all — minted, or stuck at "Pending"
 * after a failed mint.
 *
 * This mirrors the server's own `hasDOI` (`ndexdoi is not null`), which is what
 * it locks on: with a DOI present it refuses property edits, deletion, removal
 * of the read-only flag and visibility changes, allowing only `showcase`. Gating
 * the UI on the same predicate means it blocks exactly what the API blocks.
 *
 * Use this for restrictions, never `isNetworkCertified` — a network is locked
 * from the moment a request is filed, long before it is certified.
 */
export const isDOILocked = (network: FileItemBase | null | undefined): boolean =>
  isDOIPending(network) || isDOIAssigned(network)
