import React, { useCallback } from 'react'
import { MoreVertical } from 'lucide-react'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'
import { tableStyles } from '@/components/shared/table-styles'
import { isUnavailableShortcut, SHORTCUT_STYLES } from '@/utils/shortcut-utils'

interface ShortcutActionButtonProps {
  network: FileItemBase
  onRemoveShortcut?: (shortcutId: string) => Promise<void>
  onDropdownToggle?: (
    event: React.MouseEvent,
    id: string,
    type: NDExFileType,
  ) => void
}

/**
 * Specialized component for shortcut action buttons
 * Shows either "Remove shortcut" for unavailable shortcuts or dropdown menu for normal ones
 */
export const ShortcutActionButton: React.FC<ShortcutActionButtonProps> = ({
  network,
  onRemoveShortcut,
  onDropdownToggle
}) => {
  const isUnavailable = isUnavailableShortcut(network)

  const handleRemoveClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onRemoveShortcut) return

    try {
      await onRemoveShortcut(network.uuid)
    } catch (error) {
      console.error('Error removing shortcut:', error)
      // Consider adding toast notification here
    }
  }, [onRemoveShortcut, network.uuid])

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDropdownToggle) {
      onDropdownToggle(e, network.uuid, network.type)
    }
  }, [onDropdownToggle, network.uuid, network.type])

  if (isUnavailable && onRemoveShortcut) {
    return (
      <button
        className={SHORTCUT_STYLES.REMOVE_BUTTON}
        onClick={handleRemoveClick}
        aria-label={`Remove shortcut for ${network.name}`}
      >
        Remove shortcut
      </button>
    )
  }

  if (onDropdownToggle && !isUnavailable) {
    return (
      <button
        className={tableStyles.button.dropdown}
        onClick={handleDropdownClick}
        data-dropdown-trigger
        data-dropdown-id={network.uuid}
        aria-label={`Open actions menu for ${network.name}`}
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }

  return null
}

export default ShortcutActionButton