import { NDExFileType } from '@js4cytoscape/ndex-client'
import { TRASH_RETENTION_DAYS } from '@/lib/constants/trash'

export interface TrashConfirmationCopy {
  title: string
  message: string
}

/** Just enough of a file to describe it in the confirmation prompt. */
export type TrashConfirmationItem = {
  name?: string
  type?: NDExFileType
}

const SINGLE_TITLES: Record<string, string> = {
  [NDExFileType.FOLDER]: 'Move folder to trash?',
  [NDExFileType.SHORTCUT]: 'Move shortcut to trash?',
  [NDExFileType.NETWORK]: 'Move network to trash?',
}

/**
 * Builds the wording for the move-to-trash confirmation.
 *
 * Shown for every move-to-trash, folders empty or not, and always states the
 * retention window so the action reads as recoverable rather than final.
 * Folder wording covers contents because trashing a folder cascades through
 * everything inside it.
 */
export const buildTrashConfirmation = (
  items: TrashConfirmationItem[],
): TrashConfirmationCopy => {
  const consequence = `Items in the trash are deleted forever after ${TRASH_RETENTION_DAYS} days.`
  const containsFolder = items.some((item) => item.type === NDExFileType.FOLDER)

  if (items.length === 1) {
    const [item] = items
    const label = item.name ? `"${item.name}"` : 'This item'
    const subject =
      item.type === NDExFileType.FOLDER
        ? `${label} and any contents`
        : label

    return {
      title:
        (item.type && SINGLE_TITLES[item.type]) ?? 'Move to trash?',
      message: `${subject} will be moved to the trash. ${consequence}`,
    }
  }

  const subject = containsFolder
    ? `${items.length} items, including folders and any contents,`
    : `${items.length} items`

  return {
    title: `Move ${items.length} items to trash?`,
    message: `${subject} will be moved to the trash. ${consequence}`,
  }
}

/**
 * Builds the wording for the restore confirmation shown when a folder is
 * restored from the trash.
 *
 * Restoring a folder also restores everything that was trashed with it, so the
 * prompt states how many extra items are coming back — and admits it when the
 * contents could not be fully determined, rather than implying a complete
 * restore that may not happen.
 */
export const buildRestoreConfirmation = (
  roots: TrashConfirmationItem[],
  descendantCount: number,
  isPartial = false,
): TrashConfirmationCopy => {
  const label =
    roots.length === 1 && roots[0]?.name ? `"${roots[0].name}"` : 'the selected folders'

  const title =
    roots.length === 1 ? 'Restore folder from trash?' : 'Restore folders from trash?'

  const body =
    descendantCount === 0
      ? `Nothing else in the trash was found inside ${label}, so only the folder${roots.length === 1 ? '' : 's'} will be restored.`
      : `Restoring ${label} also restores its contents: ${descendantCount} item${descendantCount === 1 ? '' : 's'} will be put back in their original locations.`

  const caveat = isPartial
    ? ' Some trashed items could not be checked, so a few may stay in the trash and need restoring separately.'
    : ''

  return { title, message: `${body}${caveat}` }
}
