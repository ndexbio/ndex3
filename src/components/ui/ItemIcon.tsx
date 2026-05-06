import React from 'react'
import { Folder, File, FolderSymlink, FileSymlink, FileUser, Users, Hourglass, TriangleAlert, XCircle } from 'lucide-react'
import { NDExFileType } from '@js4cytoscape/ndex-client'

interface ItemIconProps {
  type: NDExFileType
  isShortcut: boolean
  isShared?: boolean
  isValid?: boolean
  hasWarnings?: boolean
  hasError?: boolean
  onWarningClick?: () => void
  onErrorClick?: () => void
  className?: string
}

/**
 * ItemIcon component renders icons for all NDEx file types (networks, folders, and shortcuts).
 * Implements a priority-based system for displaying different states:
 * 1. Invalid state (hourglass) - highest priority
 * 2. Error state (red X) - second priority
 * 3. Warning state (yellow triangle) - third priority
 * 4. Shared state (special icons) - fourth priority
 * 5. Default state (standard icons) - lowest priority
 *
 * For shortcuts, uses green-colored symlink icons with built-in arrows.
 */
export const ItemIcon: React.FC<ItemIconProps> = ({
  type,
  isShortcut,
  isShared = false,
  isValid = true,
  hasWarnings = false,
  hasError = false,
  onWarningClick,
  onErrorClick,
  className = "h-5 w-5"
}) => {
  // Base icon colors
  const folderColor = "text-muted-foreground"
  const networkColor = "text-sky-700"

  // Shortcut colors (green variants)
  const shortcutFolderColor = "text-green-600"
  const shortcutNetworkColor = "text-green-600"

  if (!isShortcut) {
    // Regular icons - check for shared state
    if (type === NDExFileType.FOLDER) {
      if (isShared) {
        // Shared folder: Folder icon with small Users overlay in the middle
        return (
          <div className="relative inline-block">
            <Folder className={`${className} ${folderColor}`} />
            <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-2 w-2 text-blue-500" />
          </div>
        )
      }
      return <Folder className={`${className} ${folderColor}`} />
    } else if (type === NDExFileType.NETWORK) {
      if (!isValid) {
        // Invalid network: Hourglass icon (highest priority)
        return <Hourglass className={`${className} ${networkColor}`} />
      } else if (hasError) {
        // Error state: Red XCircle icon (second priority)
        return (
          <button 
            type="button"
            className="cursor-pointer pointer-events-auto inline-flex p-0 border-none bg-transparent focus:outline-none relative z-20" 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              onErrorClick?.()
            }}
          >
            <XCircle
              className={`${className} text-red-500`}
              title="Invalid network. Click for details."
            />
          </button>
        )
      } else if (hasWarnings) {
        // Warning state: Yellow TriangleAlert icon (third priority)
        return (
          <button 
            type="button"
            className="cursor-pointer pointer-events-auto inline-flex p-0 border-none bg-transparent focus:outline-none relative z-20" 
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              onWarningClick?.()
            }}
          >
            <TriangleAlert 
              className={`${className} text-yellow-500`}
              title="Network data warnings. Click for details."
            />
          </button>
        )
      } else if (isShared) {
        // Shared network: FileUser icon
        return <FileUser className={`${className} ${networkColor}`} />
      }
      return <File className={`${className} ${networkColor}`} />
    }
    return <File className={`${className} ${networkColor}`} />
  }

  // Shortcut icons with green color - both have built-in arrows now
  const isFolderShortcut = type === NDExFileType.FOLDER ||
    (type === NDExFileType.SHORTCUT && (type as any)?.target_type === NDExFileType.FOLDER)

  if (isFolderShortcut) {
    // Folder shortcuts: green FolderSymlink icon (has built-in arrow)
    return <FolderSymlink className={`${className} ${shortcutFolderColor}`} />
  } else {
    // Network shortcuts: green FileSymlink icon (has built-in arrow)
    return <FileSymlink className={`${className} ${shortcutNetworkColor}`} />
  }
}

export default ItemIcon