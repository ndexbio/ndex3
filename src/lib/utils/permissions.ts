import { Permission, NDExUser } from '@js4cytoscape/ndex-client'
import { FileItemBase } from '@/types/api/ndex/File'

/**
 * Ownership / edit-permission checks shared by the folder view, action menus,
 * and selection toolbar.
 *
 * The server is the authority on permissions; these checks only decide what
 * the UI offers. A denied action would be rejected server-side regardless.
 */

/** Minimal item shape needed for permission checks (FileItemBase-compatible). */
export interface PermissionCheckable {
  owner?: string
  permission?: Permission
}

/** True when the signed-in user owns the item (matched by userName). */
export const isItemOwner = (
  item: PermissionCheckable | FileItemBase | null | undefined,
  user: Pick<NDExUser, 'userName'> | null | undefined,
): boolean =>
  !!item?.owner && !!user?.userName && item.owner === user.userName

/**
 * True when the user may edit the item: owner, or explicitly granted WRITE
 * permission (e.g. items surfaced in the Shared-with-me listing).
 */
export const canEditItem = (
  item: PermissionCheckable | FileItemBase | null | undefined,
  user: Pick<NDExUser, 'userName'> | null | undefined,
): boolean =>
  isItemOwner(item, user) || item?.permission === Permission.WRITE

/**
 * True when the viewer may manage the folder currently being viewed
 * (bulk move/trash/share, drag-and-drop, breadcrumb rooted at My Drive).
 * Anonymous viewers and signed-in non-owners are read-only.
 */
export const canEditFolder = (
  folder: PermissionCheckable | FileItemBase | null | undefined,
  user: Pick<NDExUser, 'userName'> | null | undefined,
  isAuthenticated: boolean,
): boolean => isAuthenticated && isItemOwner(folder, user)
