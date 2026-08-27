import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Rebuilding folder trees inside the trash.
 *
 * Trashing a folder cascades: the server refuses to delete a non-empty folder,
 * so the UI trashes the contents first. The trash listing is therefore flat —
 * a folder and everything that was inside it arrive as sibling entries with no
 * nesting. Restoring a folder alone would bring it back empty, so the subtree
 * has to be reconstructed from each item's parent before restoring.
 */

/** Parent id, `null` for a home-level item, `undefined` when not yet known. */
export type ParentId = string | null | undefined

/**
 * Reads the parent id already carried by a listing entry.
 *
 * The trash endpoint is loosely typed and different file kinds name this field
 * differently, so every known spelling is checked. Returns `undefined` when the
 * entry carries no parent information and the caller must fetch it.
 */
export const readParentId = (item: FileItemBase): ParentId => {
  const candidate = item as FileItemBase & {
    parent?: string | null
    parentDirUUID?: string | null
  }

  const value =
    candidate.parent ??
    candidate.parentDirUUID ??
    (candidate.attributes?.parent as string | null | undefined) ??
    (candidate.attributes?.parentDirUUID as string | null | undefined)

  if (value === undefined) return undefined
  // Home-level items report an empty parent; normalise those to null so they
  // never look like a child of a folder whose id happens to be falsy.
  return value === '' ? null : value
}

/**
 * Collects every trashed descendant of the given root folders.
 *
 * Walks the parent map breadth-first. Roots themselves are not included, and
 * each item is visited once, so an item that (through malformed data) appears
 * to be its own ancestor cannot loop.
 */
export const collectTrashedDescendants = (
  items: FileItemBase[],
  parentOf: Map<string, ParentId>,
  rootIds: string[],
): FileItemBase[] => {
  const childrenOf = new Map<string, FileItemBase[]>()
  for (const item of items) {
    const parent = parentOf.get(item.uuid)
    if (typeof parent !== 'string') continue
    const siblings = childrenOf.get(parent)
    if (siblings) {
      siblings.push(item)
    } else {
      childrenOf.set(parent, [item])
    }
  }

  const seen = new Set<string>(rootIds)
  const descendants: FileItemBase[] = []
  const queue = [...rootIds]

  while (queue.length > 0) {
    const currentId = queue.shift() as string
    for (const child of childrenOf.get(currentId) ?? []) {
      if (seen.has(child.uuid)) continue
      seen.add(child.uuid)
      descendants.push(child)
      if (child.type === NDExFileType.FOLDER) {
        queue.push(child.uuid)
      }
    }
  }

  return descendants
}

export interface GroupedFileIds {
  networkIds: string[]
  folderIds: string[]
  shortcutIds: string[]
}

/** Splits items into the three id arrays the restore endpoint expects. */
export const groupIdsByType = (items: FileItemBase[]): GroupedFileIds => {
  const grouped: GroupedFileIds = {
    networkIds: [],
    folderIds: [],
    shortcutIds: [],
  }

  for (const item of items) {
    if (item.type === NDExFileType.FOLDER) {
      grouped.folderIds.push(item.uuid)
    } else if (item.type === NDExFileType.SHORTCUT) {
      grouped.shortcutIds.push(item.uuid)
    } else if (item.type === NDExFileType.NETWORK) {
      grouped.networkIds.push(item.uuid)
    }
  }

  return grouped
}
