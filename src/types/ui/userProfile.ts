import { NDExUser, FileListItem, NDExFileType, Visibility } from '@js4cytoscape/ndex-client'

// Re-export the NDEx client types for convenience
export type { NDExUser, FileListItem, NDExFileType, Visibility }

// Extended user profile type with additional UI-specific fields
export interface UserProfileData extends NDExUser {
  // Add any additional UI-specific fields if needed
  displayName?: string
}

// User content filtering and display types
export interface UserContentFilters {
  showPrivate?: boolean
  contentType?: NDExFileType | 'ALL'
}

// Error handling for user profile operations
export interface UserProfileError {
  status?: number
  message: string
  type: 'NOT_FOUND' | 'PRIVATE' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'UNKNOWN'
}

// User profile page props
export interface UserPublicPageProps {
  uuid: string
}