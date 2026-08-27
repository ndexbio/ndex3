import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import {
  ParentId,
  collectTrashedDescendants,
  groupIdsByType,
  readParentId,
} from './trash-tree'

const item = (
  uuid: string,
  type: NDExFileType,
  extra: Record<string, unknown> = {},
): FileItemBase =>
  ({
    uuid,
    name: uuid,
    type,
    modificationTime: 0,
    attributes: {},
    ...extra,
  }) as FileItemBase

describe('readParentId', () => {
  it('reads the parent from the top-level field', () => {
    expect(readParentId(item('f-1', NDExFileType.FOLDER, { parent: 'p-1' }))).toBe(
      'p-1',
    )
  })

  it('reads a network parent from parentDirUUID', () => {
    expect(
      readParentId(item('n-1', NDExFileType.NETWORK, { parentDirUUID: 'p-2' })),
    ).toBe('p-2')
  })

  it('falls back to the attributes bag', () => {
    expect(
      readParentId(
        item('n-2', NDExFileType.NETWORK, { attributes: { parent: 'p-3' } }),
      ),
    ).toBe('p-3')
  })

  it('normalises an empty parent to null (home level), not a folder id', () => {
    expect(readParentId(item('n-3', NDExFileType.NETWORK, { parent: '' }))).toBeNull()
  })

  it('returns undefined when the listing carries no parent at all', () => {
    expect(readParentId(item('n-4', NDExFileType.NETWORK))).toBeUndefined()
  })
})

describe('collectTrashedDescendants', () => {
  //   F (root)
  //   ├── n-1
  //   ├── s-1
  //   └── sub
  //       └── n-2
  //   other (unrelated, at home level)
  const folder = item('F', NDExFileType.FOLDER)
  const net1 = item('n-1', NDExFileType.NETWORK)
  const shortcut1 = item('s-1', NDExFileType.SHORTCUT)
  const sub = item('sub', NDExFileType.FOLDER)
  const net2 = item('n-2', NDExFileType.NETWORK)
  const other = item('other', NDExFileType.NETWORK)

  const items = [folder, net1, shortcut1, sub, net2, other]
  const parents = new Map<string, ParentId>([
    ['F', null],
    ['n-1', 'F'],
    ['s-1', 'F'],
    ['sub', 'F'],
    ['n-2', 'sub'],
    ['other', null],
  ])

  it('collects the whole subtree, including items nested in sub-folders', () => {
    const found = collectTrashedDescendants(items, parents, ['F'])

    expect(found.map((i) => i.uuid).sort()).toEqual(['n-1', 'n-2', 's-1', 'sub'])
  })

  it('excludes the roots themselves and unrelated trash items', () => {
    const found = collectTrashedDescendants(items, parents, ['F']).map(
      (i) => i.uuid,
    )

    expect(found).not.toContain('F')
    expect(found).not.toContain('other')
  })

  it('descends from a sub-folder root only', () => {
    expect(
      collectTrashedDescendants(items, parents, ['sub']).map((i) => i.uuid),
    ).toEqual(['n-2'])
  })

  it('returns nothing for an empty folder', () => {
    expect(collectTrashedDescendants(items, parents, ['other'])).toEqual([])
  })

  it('skips items whose parent is still unknown', () => {
    const unresolved = new Map<string, ParentId>([
      ['n-1', 'F'],
      ['s-1', undefined],
    ])

    expect(
      collectTrashedDescendants([net1, shortcut1], unresolved, ['F']).map(
        (i) => i.uuid,
      ),
    ).toEqual(['n-1'])
  })

  it('terminates on a parent cycle instead of looping forever', () => {
    const a = item('a', NDExFileType.FOLDER)
    const b = item('b', NDExFileType.FOLDER)
    const cyclic = new Map<string, ParentId>([
      ['a', 'b'],
      ['b', 'a'],
    ])

    expect(
      collectTrashedDescendants([a, b], cyclic, ['a']).map((i) => i.uuid),
    ).toEqual(['b'])
  })
})

describe('groupIdsByType', () => {
  it('splits ids into the arrays the restore endpoint expects', () => {
    expect(
      groupIdsByType([
        item('F', NDExFileType.FOLDER),
        item('n-1', NDExFileType.NETWORK),
        item('s-1', NDExFileType.SHORTCUT),
        item('n-2', NDExFileType.NETWORK),
      ]),
    ).toEqual({
      folderIds: ['F'],
      networkIds: ['n-1', 'n-2'],
      shortcutIds: ['s-1'],
    })
  })
})
