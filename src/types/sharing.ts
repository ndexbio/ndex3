import { Visibility, NDExFileType } from '@js4cytoscape/ndex-client'

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
  onSuccess?: (updatedItems: { uuid: string; visibility: Visibility }[]) => void;
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