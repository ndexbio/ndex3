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
  // DOI / certification state. Networks only — never present on folders or
  // shortcuts. `doi` is the literal string "pending" while a request is in
  // flight, and the assigned DOI afterwards.
  //
  // `isCertified` is absent from folder/home listings on servers older than the
  // change that added it, so a listing row alone may not distinguish a
  // pre-certified network from a certified one. Read these through
  // `network-status.ts`, never directly.
  doi?: string
  isCertified?: boolean
  // Network status, returned at the top level by every listing endpoint and
  // read by the row components. Declared rather than reached through `as any`
  // so a mapper that drops one is a type error, not a silent blank row.
  isReadOnly?: boolean
  isValid?: boolean
  isShared?: boolean
  isCompleted?: boolean
  errorMessage?: string
  warnings?: string[]
  attributes: {
    [key: string]: any
    // Shortcut-specific attributes
    target_status?: ShortcutTargetStatus
    target_type?: NDExFileType
    // Allow any other attributes
  }
}