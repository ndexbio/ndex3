import { Visibility, NDExFileType, Permission } from '@js4cytoscape/ndex-client'

export interface ShareableItem {
  uuid: string;
  name: string;
  type: NDExFileType;
  currentPermissions?: UserPermission[];
  visibility?: Visibility;
}

export interface UserPermission {
  userUuid: string; // User's UUID (externalId from NDEx API)
  username: string; // Human-readable username
  email: string;
  fullName: string;
  permission: 'READ' | 'EDIT' | 'MIXED';
  isOwner?: boolean;
}

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShareableItem[];
  mode: 'single' | 'bulk';
  onSuccess?: (updatedItems: any[]) => void;
}

export interface ShareDialogState {
  selectedItems: ShareableItem[];
  userPermissions: Map<string, UserPermission>;
  visibility: Visibility | 'mixed';
  isLoading: boolean;
  error: string | null;
  newUserInput: string;
}

export type PermissionLevel = 'READ' | 'EDIT';
export type PermissionAction = 'read' | 'edit' | 'transfer' | 'remove';
export type VisibilityLevel = Visibility;

export interface User {
  username: string;
  email: string;
  fullName: string;
}

/**
 * Permission details for a file including its type and member permissions
 */
export interface FilePermissionDetails {
  /**
   * The type of the file (NETWORK, FOLDER, or SHORTCUT)
   */
  type: NDExFileType;

  /**
   * Map of user UUIDs to their permission levels on this file
   */
  members: Record<string, Permission>;
}

/**
 * List of file permission records returned by listMembers
 */
export type FilePermissionList = Record<string, FilePermissionDetails>[];