import React from 'react'
import { Folder, File, CornerUpRight } from 'lucide-react'
import { NDExFileType } from '@js4cytoscape/ndex-client'

interface ShortcutIconProps {
  type: NDExFileType
  isShortcut: boolean
  className?: string
}

/**
 * ShortcutIcon component renders either a regular icon or a shortcut version
 * with a small arrow overlay in the top-right corner, similar to Google Drive's design
 */
export const ShortcutIcon: React.FC<ShortcutIconProps> = ({
  type,
  isShortcut,
  className = "h-5 w-5"
}) => {
  // Base icon colors
  const folderColor = "text-muted-foreground"
  const networkColor = "text-sky-700"

  // Shortcut colors (green variants)
  const shortcutFolderColor = "text-green-600"
  const shortcutNetworkColor = "text-green-600"

  if (!isShortcut) {
    // Regular icons without overlay
    if (type === NDExFileType.FOLDER) {
      return <Folder className={`${className} ${folderColor}`} />
    } else if (type === NDExFileType.NETWORK) {
      return <File className={`${className} ${networkColor}`} />
    }
    return <File className={`${className} ${networkColor}`} />
  }

  // Shortcut icons with green color and arrow overlay
  return (
    <div className="relative inline-block">
      {/* Base icon with green color for shortcuts */}
      {type === NDExFileType.FOLDER ||
       (type === NDExFileType.SHORTCUT && (type as any)?.target_type === NDExFileType.FOLDER) ? (
        <Folder className={`${className} ${shortcutFolderColor}`} />
      ) : (
        <File className={`${className} ${shortcutNetworkColor}`} />
      )}

      {/* Arrow overlay for shortcuts */}
      <CornerUpRight
        className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-blue-600 bg-white dark:bg-gray-800 rounded-full p-0.5 border border-gray-200 dark:border-gray-600"
      />
    </div>
  )
}

export default ShortcutIcon