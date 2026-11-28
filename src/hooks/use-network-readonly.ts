import { useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useToast } from '@/lib/contexts/ToastContext'

export const useNetworkReadOnly = () => {
  const config = useConfig()
  const { token } = useAuth()
  const { addToast } = useToast()
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({})

  const setNetworkReadOnly = async (
    networkId: string,
    readOnly: boolean,
  ): Promise<boolean> => {
    setIsUpdating((prev) => ({ ...prev, [networkId]: true }))
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.networks.setReadOnly(networkId, readOnly)

      // Update the cache to reflect the readonly status change
      // Use synchronous update for immediate UI reflection
      globalMutate(
        (key) => {
          return Array.isArray(key) && key[0] === 'folderContents' && key[2] === token
        },
        (currentData: any) => {
          // The cache data is an array directly, not wrapped in an object
          if (Array.isArray(currentData)) {
            return currentData.map((item: any) =>
              item.uuid === networkId
                ? { ...item, isReadOnly: readOnly }
                : item
            )
          }
          return currentData
        },
        { revalidate: false } // Update optimistically without server revalidation
      )

      addToast({
        title: 'Success',
        description: `Network ${readOnly ? 'set as read-only' : 'read-only removed'}`,
        type: 'success',
        duration: 4000,
      })
      return true
    } catch (error) {
      console.error('Error updating network readonly status:', error)
      addToast({
        title: 'Error',
        description: `Failed to ${readOnly ? 'set' : 'remove'} read-only status`,
        type: 'error',
        duration: 4000,
      })
      return false
    } finally {
      setIsUpdating((prev) => ({ ...prev, [networkId]: false }))
    }
  }

  const setBulkNetworkReadOnly = async (
    networkIds: string[],
    readOnly: boolean,
  ): Promise<{ success: number; failed: number }> => {
    const results = { success: 0, failed: 0 }
    const successfulIds: string[] = []

    // Mark all networks as updating
    setIsUpdating((prev) => {
      const updated = { ...prev }
      networkIds.forEach((id) => {
        updated[id] = true
      })
      return updated
    })

    try {
      // Process all networks in parallel
      const promises = networkIds.map(async (networkId) => {
        try {
          const ndexClient = getNdexClient(config.ndexBaseUrl, token)
          await ndexClient.networks.setReadOnly(networkId, readOnly)
          results.success++
          successfulIds.push(networkId)
          return true
        } catch (error) {
          console.error(
            `Error updating readonly status for network ${networkId}:`,
            error,
          )
          results.failed++
          return false
        }
      })

      await Promise.all(promises)

      // Update the cache for all successfully updated networks
      if (successfulIds.length > 0) {
        globalMutate(
          (key) => {
            return Array.isArray(key) && key[0] === 'folderContents' && key[2] === token
          },
          (currentData: any) => {
            // The cache data is an array directly, not wrapped in an object
            if (Array.isArray(currentData)) {
              return currentData.map((item: any) =>
                successfulIds.includes(item.uuid)
                  ? { ...item, isReadOnly: readOnly }
                  : item
              )
            }
            return currentData
          },
          { revalidate: false } // Update optimistically without server revalidation
        )
      }

      // Show summary toast
      if (results.failed === 0) {
        addToast({
          title: 'Success',
          description: `${results.success} network${results.success > 1 ? 's' : ''} ${readOnly ? 'set as read-only' : 'read-only removed'}`,
          type: 'success',
          duration: 4000,
        })
      } else if (results.success === 0) {
        addToast({
          title: 'Error',
          description: `Failed to update ${results.failed} network${results.failed > 1 ? 's' : ''}`,
          type: 'error',
          duration: 4000,
        })
      } else {
        addToast({
          title: 'Warning',
          description: `Updated ${results.success} network${results.success > 1 ? 's' : ''}. ${results.failed} failed.`,
          type: 'warning',
          duration: 4000,
        })
      }
    } finally {
      // Clear updating state for all networks
      setIsUpdating((prev) => {
        const updated = { ...prev }
        networkIds.forEach((id) => {
          updated[id] = false
        })
        return updated
      })
    }

    return results
  }

  return {
    setNetworkReadOnly,
    setBulkNetworkReadOnly,
    isUpdating,
  }
}