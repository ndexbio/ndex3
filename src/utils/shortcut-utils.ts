import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

// Constants for shortcut target status
export const SHORTCUT_TARGET_STATUS = {
  ACTIVE: 'ACTIVE',
  IN_TRASH: 'IN_TRASH',
  DELETED: 'DELETED'
} as const

export type ShortcutTargetStatus = typeof SHORTCUT_TARGET_STATUS[keyof typeof SHORTCUT_TARGET_STATUS]

// Constants for styling
export const SHORTCUT_STYLES = {
  UNAVAILABLE_TEXT: 'text-muted-foreground opacity-60',
  NORMAL_TEXT: 'text-foreground',
  REMOVE_BUTTON: 'px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-md transition-colors duration-200',
  MESSAGE_CONTAINER: 'flex items-center justify-start w-full text-sm text-muted-foreground italic',
  COLUMN_SPAN: 2
} as const

// Type guards
export const isShortcut = (item: FileItemBase): boolean => {
  return item.type === NDExFileType.SHORTCUT
}

export const isUnavailableShortcut = (item: FileItemBase): boolean => {
  if (!isShortcut(item)) return false

  const status = item.attributes?.target_status as ShortcutTargetStatus
  return status === SHORTCUT_TARGET_STATUS.IN_TRASH ||
         status === SHORTCUT_TARGET_STATUS.DELETED
}

// Message helpers
export const getUnavailableShortcutMessage = (item: FileItemBase): string => {
  if (!isShortcut(item)) return ''
  const status = (item.attributes?.target_status as ShortcutTargetStatus) || null

  switch (status) {
    case SHORTCUT_TARGET_STATUS.IN_TRASH:
      return 'Original moved to trash'
    case SHORTCUT_TARGET_STATUS.DELETED:
      return 'Original item deleted'
    default:
      return ''
  }
}