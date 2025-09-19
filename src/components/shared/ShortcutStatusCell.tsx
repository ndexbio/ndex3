import React from 'react'
import { FileItemBase } from '@/types/api/ndex/File'
import { getTdClasses } from '@/components/shared/table-styles'
import {
  isUnavailableShortcut,
  getUnavailableShortcutMessage,
  SHORTCUT_STYLES
} from '@/utils/shortcut-utils'
import { formatDate, formatCount } from '@/components/shared/table-utils'

interface ShortcutStatusCellProps {
  network: FileItemBase
}

/**
 * Specialized component for rendering shortcut status in table cells
 * Handles both normal content (edges + date) and unavailable shortcuts (status message)
 */
export const ShortcutStatusCell: React.FC<ShortcutStatusCellProps> = ({ network }) => {
  const isUnavailable = isUnavailableShortcut(network)

  if (isUnavailable) {
    return (
      <td className={getTdClasses('left')} colSpan={SHORTCUT_STYLES.COLUMN_SPAN}>
        <div className={SHORTCUT_STYLES.MESSAGE_CONTAINER}>
          <span className="truncate">
            {getUnavailableShortcutMessage(network)}
          </span>
        </div>
      </td>
    )
  }

  return (
    <>
      <td className={getTdClasses('right')}>
        <div className="flex items-center justify-end w-full text-sm text-muted-foreground">
          <span className="truncate">
            {formatCount(
              network.attributes?.edges ||
              network.attributes?.edgeCount ||
              (network as any).edgeCount ||
              0
            )}
          </span>
        </div>
      </td>
      <td className={getTdClasses('left')}>
        <div className="flex items-center justify-start w-full text-sm text-muted-foreground">
          <span className="truncate">
            {formatDate(network.modificationTime)}
          </span>
        </div>
      </td>
    </>
  )
}

export default ShortcutStatusCell