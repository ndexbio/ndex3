import { Permission } from '@js4cytoscape/ndex-client'
import { isItemOwner, canEditItem, canEditFolder } from './permissions'

const alice = { userName: 'alice' }

describe('permissions', () => {
  describe('isItemOwner', () => {
    it('true when owner matches userName', () => {
      expect(isItemOwner({ owner: 'alice' }, alice)).toBe(true)
    })

    it('false for a different owner', () => {
      expect(isItemOwner({ owner: 'bob' }, alice)).toBe(false)
    })

    it('false for anonymous viewers (no user)', () => {
      expect(isItemOwner({ owner: 'alice' }, null)).toBe(false)
      expect(isItemOwner({ owner: 'alice' }, undefined)).toBe(false)
    })

    it('false when the item has no owner field', () => {
      expect(isItemOwner({}, alice)).toBe(false)
      expect(isItemOwner(null, alice)).toBe(false)
    })

    it('false when both owner and userName are empty strings', () => {
      expect(isItemOwner({ owner: '' }, { userName: '' })).toBe(false)
    })
  })

  describe('canEditItem', () => {
    it('owner can edit', () => {
      expect(canEditItem({ owner: 'alice' }, alice)).toBe(true)
    })

    it('WRITE permission grants edit to non-owners', () => {
      expect(
        canEditItem({ owner: 'bob', permission: Permission.WRITE }, alice),
      ).toBe(true)
    })

    it('READ permission does not grant edit', () => {
      expect(
        canEditItem({ owner: 'bob', permission: Permission.READ }, alice),
      ).toBe(false)
    })

    it('anonymous cannot edit even with WRITE marker present', () => {
      expect(canEditItem({ owner: 'bob' }, null)).toBe(false)
    })
  })

  describe('canEditFolder', () => {
    it('authenticated owner can edit the folder', () => {
      expect(canEditFolder({ owner: 'alice' }, alice, true)).toBe(true)
    })

    it('signed-in non-owner is read-only', () => {
      expect(canEditFolder({ owner: 'bob' }, alice, true)).toBe(false)
    })

    it('anonymous is read-only regardless of owner match', () => {
      expect(canEditFolder({ owner: 'alice' }, alice, false)).toBe(false)
    })

    it('read-only while folder metadata has not loaded', () => {
      expect(canEditFolder(null, alice, true)).toBe(false)
      expect(canEditFolder(undefined, alice, true)).toBe(false)
    })
  })
})
