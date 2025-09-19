import { NDExFileType } from '@js4cytoscape/ndex-client'

// Shortcut target status type
export type ShortcutTargetStatus = 'ACTIVE' | 'IN_TRASH' | 'DELETED'

export interface FileItemBase {
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date | number
  attributes: {
    [key: string]: any
    // Common network attributes
    edges?: number
    nodes?: number
    edgeCount?: number
    nodeCount?: number
    visibility?: string
    owner?: string
    updatedBy?: string
    // Shortcut-specific attributes
    target_status?: ShortcutTargetStatus
    target_type?: NDExFileType
    // Allow any other attributes
  }
}