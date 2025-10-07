import { NDExFileType, Permission } from '@js4cytoscape/ndex-client'

// Shortcut target status type
export type ShortcutTargetStatus = 'ACTIVE' | 'IN_TRASH' | 'DELETED'

export interface FileItemBase {
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date | number
  // Top-level attributes (moved from nested attributes object in ndex-client v2)
  owner?: string
  ownerUUID?: string
  visibility?: string
  updatedBy?: string
  edges?: number
  permission?: Permission
  attributes: {
    [key: string]: any
    // Shortcut-specific attributes
    target_status?: ShortcutTargetStatus
    target_type?: NDExFileType
    // Allow any other attributes
  }
}