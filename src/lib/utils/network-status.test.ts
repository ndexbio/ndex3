import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import {
  isDOIAssigned,
  isDOIPending,
  isDOILocked,
  isNetworkCertified,
  isPreCertified,
} from './network-status'

const item = (overrides: Partial<FileItemBase> = {}): FileItemBase => ({
  uuid: 'network-uuid',
  name: 'A network',
  type: NDExFileType.NETWORK,
  modificationTime: 0,
  attributes: {},
  ...overrides,
})

/** DOI minted with "add reference later" ticked — the reference is still owed. */
const preCertified = item({ doi: '10.18119/N9TEST', isCertified: false })

/** A request whose mint failed, leaving the network locked at "Pending". */
const stuck = item({ doi: 'Pending', isCertified: false })

/** A network that completed the flow: reference supplied, DOI assigned. */
const certified = item({ doi: '10.18119/N9TEST', isCertified: true })

describe('DOI state helpers', () => {
  describe('isDOIPending', () => {
    it('is true when a mint has failed', () => {
      expect(isDOIPending(stuck)).toBe(true)
    })

    it('is case-insensitive, matching the legacy app', () => {
      expect(isDOIPending(item({ doi: 'PENDING' }))).toBe(true)
    })

    it('is false once a real DOI is assigned', () => {
      expect(isDOIPending(certified)).toBe(false)
    })

    it('is false when there is no DOI at all', () => {
      expect(isDOIPending(item())).toBe(false)
      expect(isDOIPending(item({ doi: '' }))).toBe(false)
    })
  })

  describe('isDOIAssigned', () => {
    it('is true only for a real DOI', () => {
      expect(isDOIAssigned(certified)).toBe(true)
      expect(isDOIAssigned(stuck)).toBe(false)
      expect(isDOIAssigned(item())).toBe(false)
    })
  })

  describe('isNetworkCertified', () => {
    it('reflects the isCertified flag', () => {
      expect(isNetworkCertified(certified)).toBe(true)
      expect(isNetworkCertified(preCertified)).toBe(false)
      expect(isNetworkCertified(item())).toBe(false)
    })
  })

  describe('isPreCertified', () => {
    it('is true for a minted DOI that is not yet certified', () => {
      expect(isPreCertified(preCertified)).toBe(true)
    })

    it('is false once the network is certified', () => {
      expect(isPreCertified(certified)).toBe(false)
    })

    it('is false when no DOI has been requested', () => {
      expect(isPreCertified(item())).toBe(false)
    })

    // Deliberately stricter than the server, whose hasDOI check is only
    // "ndexdoi is not null" and so matches a failed mint too. Adding a
    // reference to a stuck network would certify it and publish it with a DOI
    // field reading "Pending" that never resolves.
    it('is false for a request whose mint failed', () => {
      expect(isPreCertified(stuck)).toBe(false)
    })
  })

  // Mirrors the server's own hasDOI, which is what it locks on.
  describe('isDOILocked', () => {
    it('is true for a minted DOI', () => {
      expect(isDOILocked(preCertified)).toBe(true)
      expect(isDOILocked(certified)).toBe(true)
    })

    it('is true for a failed mint, which the server also keeps locked', () => {
      expect(isDOILocked(stuck)).toBe(true)
    })

    it('is false when no DOI has been requested', () => {
      expect(isDOILocked(item())).toBe(false)
    })

    it.each([
      ['a folder', NDExFileType.FOLDER],
      ['a shortcut', NDExFileType.SHORTCUT],
    ])('is false for %s carrying a stray doi', (_label, type) => {
      expect(isDOILocked(item({ type, doi: 'Pending' }))).toBe(false)
    })
  })

  describe('a failed mint is distinct from pre-certified', () => {
    it('reads as pending, not assigned', () => {
      expect(isDOIPending(stuck)).toBe(true)
      expect(isDOIAssigned(stuck)).toBe(false)
    })

    it('still counts as having a DOI for the purpose of restrictions', () => {
      // The server keeps it locked, so the UI must too.
      expect(isDOIPending(stuck) || isDOIAssigned(stuck)).toBe(true)
    })
  })

  // DOI applies to networks only. Folders and shortcuts must never satisfy any
  // predicate, even if the listing hands back a stray doi/isCertified field.
  describe.each([
    ['a folder', NDExFileType.FOLDER],
    ['a shortcut', NDExFileType.SHORTCUT],
  ])('%s', (_label, type) => {
    const nonNetwork = item({ type, doi: 'pending', isCertified: false })

    it('is never pre-certified', () => {
      expect(isPreCertified(nonNetwork)).toBe(false)
    })

    it('is never reported as having a DOI', () => {
      expect(isDOIPending(nonNetwork)).toBe(false)
      expect(isDOIAssigned(nonNetwork)).toBe(false)
      expect(isDOIAssigned(nonNetwork)).toBe(false)
    })

    it('is never reported as certified', () => {
      expect(isNetworkCertified(item({ type, isCertified: true }))).toBe(false)
    })
  })

  describe('null safety', () => {
    it('treats a missing item as having no DOI state', () => {
      expect(isPreCertified(null)).toBe(false)
      expect(isDOIPending(undefined)).toBe(false)
      expect(isNetworkCertified(null)).toBe(false)
    })
  })

  describe('isDOIAssigned', () => {
    it('is true only for an assigned DOI', () => {
      expect(isDOIAssigned(certified)).toBe(true)
      expect(isDOIAssigned(stuck)).toBe(false)
      expect(isDOIAssigned(item())).toBe(false)
    })
  })
})

/**
 * The predicates are network-only by construction, which means they key off
 * `type`. A raw NetworkSummary has no `type` field, so callers holding one must
 * shape it before asking — DetailsPanel does. Without that, a network stuck at
 * "Pending" reads as having no DOI at all and renders as a real doi.org link.
 */
describe('raw network summaries must be shaped before use', () => {
  const rawSummary = { externalId: 'n', name: 'x', doi: 'Pending', isCertified: false } as any

  it('returns false for an unshaped summary — the trap', () => {
    expect(isDOIPending(rawSummary)).toBe(false)
  })

  it('reads correctly once the type is supplied', () => {
    expect(isDOIPending({ ...rawSummary, type: NDExFileType.NETWORK })).toBe(true)
  })
})

/**
 * `requestDOI` sets `certified` before calling the minting service, and the
 * failure paths reset `doi` to "Pending" without clearing the flag. So a
 * "certify now" request whose mint failed is left certified with no DOI.
 * Reading `isCertified` on its own reports it as published.
 */
describe('isCertified is only meaningful with a real DOI', () => {
  const failedCertifyNow = item({ doi: 'Pending', isCertified: true })

  it('is not certified when the DOI never minted', () => {
    expect(isNetworkCertified(failedCertifyNow)).toBe(false)
  })

  it('reads as a failed mint, and nothing else', () => {
    expect(isDOIPending(failedCertifyNow)).toBe(true)
    // Not pre-certified: there is no DOI to attach a reference to.
    expect(isPreCertified(failedCertifyNow)).toBe(false)
    // Still locked — the server keeps it read-only until the request is cancelled.
    expect(isDOILocked(failedCertifyNow)).toBe(true)
  })

  it.each([
    ['an absent DOI', undefined],
    ['an empty DOI', ''],
    ['a pending DOI', 'Pending'],
    ['a lowercase pending DOI', 'pending'],
  ])('is not certified with %s, whatever the flag says', (_label, doi) => {
    expect(isNetworkCertified(item({ doi, isCertified: true }))).toBe(false)
  })

  it('is certified once a real DOI exists', () => {
    expect(isNetworkCertified(item({ doi: '10.18119/N9TEST', isCertified: true }))).toBe(true)
  })
})
