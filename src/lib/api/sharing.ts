import { NDExClient, Permission, NDExFileType, Visibility } from '@js4cytoscape/ndex-client'
import { ShareableItem, UserPermission, FilePermissionList } from '@/types/sharing'

export const updateMemberPermissions = async (
  client: NDExClient,
  items: ShareableItem[],
  userPermissions: Map<string, UserPermission>
): Promise<void> => {

  // Convert items to the format expected by the API
  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  // Convert user permissions to the format expected by the API
  const members: Record<string, Permission | null> = {}
  userPermissions.forEach((user) => {
    // Use the user's UUID (externalId) as the key for the API
    members[user.userUuid] = user.permission === 'READ' ? Permission.READ : Permission.WRITE
  })

  try {
    const result = await client.files.updateMember({
      files,
      members
    })
    console.log('Permission update result:', result)
  } catch (error) {
    console.error('Failed to update permissions:', error)
    throw new Error('Failed to update sharing permissions')
  }
}

export const removeMemberPermissions = async (
  client: NDExClient,
  items: ShareableItem[],
  userUuid: string
): Promise<void> => {

  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  const members: Record<string, Permission | null> = {
    [userUuid]: null // null removes the permission
  }

  try {
    await client.files.updateMember({
      files,
      members
    })
  } catch (error) {
    console.error('Failed to remove permissions:', error)
    throw new Error('Failed to remove sharing permissions')
  }
}

export const getExistingPermissions = async (
  client: NDExClient,
  items: ShareableItem[]
): Promise<FilePermissionList | null> => {
  if (!items || items.length === 0) {
    return null
  }

  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  try {
    const result = await client.files.listMembers(files)
    return result
  } catch (error) {
    console.error('Failed to get existing permissions:', error)
    // Return null instead of throwing to allow graceful degradation
    return null
  }
}

export const updateVisibility = async (
  client: NDExClient,
  itemUuid: string,
  itemType: NDExFileType,
  visibility: Visibility
): Promise<void> => {
  try {
    await client.files.setVisibility({
      files: {
        [itemUuid]: itemType
      },
      visibility: visibility
    })
    console.log(`Successfully updated ${itemUuid} visibility to ${visibility}`)
  } catch (error) {
    console.error(`Failed to update ${itemUuid} visibility to ${visibility}:`, error)
    throw new Error('Failed to update visibility')
  }
}

export const updateBulkVisibility = async (
  client: NDExClient,
  items: ShareableItem[],
  visibility: Visibility
): Promise<void> => {
  // Convert items to the format expected by the API
  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  try {
    await client.files.setVisibility({
      files,
      visibility: visibility
    })
    console.log(`Successfully updated visibility to ${visibility} for ${items.length} items`)
  } catch (error) {
    console.error(`Failed to update visibility to ${visibility} for ${items.length} items:`, error)
    throw new Error('Failed to update visibility')
  }
}

// TODO: Implement user search API when available
export const searchUsers = async (query: string): Promise<any[]> => {
  console.log(`TODO: Searching for users with query: ${query}`)
  // This will be implemented when the user search API is available
  return []
}

/**
 * Check if access keys already exist for networks by getting network access key
 */
export const getNetworkAccessKey = async (
  client: NDExClient,
  networkUuid: string
): Promise<string | null> => {
  try {
    // Use the proper NDEx client method to get network access key
    const result = await client.networks.getNetworkAccessKey(networkUuid)

    if (result && typeof result === 'object' && 'accessKey' in result) {
      const accessKey = (result as { accessKey: string }).accessKey
      return accessKey
    }

    return null
  } catch (error) {
    console.log(`No access key found for network ${networkUuid}`)
    return null
  }
}

/**
 * Check if access keys already exist for folders by getting folder access key
 */
export const getFolderAccessKey = async (
  client: NDExClient,
  folderUuid: string
): Promise<string | null> => {
  try {
    // Use the proper NDEx client method to get folder access key
    const result = await client.files.getFolderAccessKey(folderUuid)

    if (result && typeof result === 'object' && 'accessKey' in result) {
      const accessKey = (result as { accessKey: string }).accessKey
      return accessKey
    }

    return null
  } catch (error) {
    console.log(`No access key found for folder ${folderUuid}`)
    return null
  }
}

/**
 * Generate access keys for sharing files publicly
 */
export const generateAccessKeys = async (
  client: NDExClient,
  items: ShareableItem[]
): Promise<Record<string, string>> => {
  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  try {
    const result = await client.files.share(files)
    console.log('Access key generation result:', result)
    return result
  } catch (error) {
    console.error('Failed to generate access keys:', error)
    throw new Error('Failed to generate access keys')
  }
}

/**
 * Revoke access keys for files
 */
export const revokeAccessKeys = async (
  client: NDExClient,
  items: ShareableItem[]
): Promise<void> => {
  const files: Record<string, NDExFileType> = {}
  items.forEach(item => {
    files[item.uuid] = item.type
  })

  try {
    await client.files.unshare(files)
  } catch (error) {
    console.error('Failed to revoke access keys:', error)
    throw new Error('Failed to revoke access keys')
  }
}

/**
 * Transfer ownership of networks to a new owner
 */
export const transferOwnership = async (
  client: NDExClient,
  items: ShareableItem[],
  newOwnerUuid: string
): Promise<void> => {
  // Extract network UUIDs from items (only networks can have ownership transferred)
  const networks = items
    .filter(item => item.type === NDExFileType.NETWORK)
    .map(item => item.uuid)

  if (networks.length === 0) {
    throw new Error('No networks selected for ownership transfer')
  }

  try {
    await client.files.transferOwnership({
      networks,
      newOwner: newOwnerUuid
    })
    console.log(`Successfully transferred ownership of ${networks.length} networks to ${newOwnerUuid}`)
  } catch (error) {
    console.error(`Failed to transfer ownership of ${networks.length} networks:`, error)
    throw new Error('Failed to transfer ownership')
  }
}

/**
 * Construct shareable URL using access key
 */
export const constructShareableUrl = (
  baseUrl: string,
  networkUuid: string,
  accessKey: string
): string => {
  return `${baseUrl}/viewer/networks/${networkUuid}?accesskey=${accessKey}`
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}