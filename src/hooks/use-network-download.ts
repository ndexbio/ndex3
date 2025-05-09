import { useState } from 'react'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useNetworkOperation } from './use-network-operation'
import { saveAsFile, formatNetworkFilename } from '@/lib/utils/download-utils'
import { getNdexClient } from '@/lib/api/ndex-client-manager'

type DownloadFormat = 'CX' | 'CX2'

interface DownloadOptions {
  format: DownloadFormat
  includeNetworkName?: boolean
}

/**
 * Hook for handling network downloads
 */
export const useNetworkDownload = () => {
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({})
  const config = useConfig()
  const { token } = useAuth()
  const { downloadRawNetwork, downloadCX2Network } = useNetworkOperation()

  /**
   * Download a single network
   * @param networkId The ID of the network to download
   * @param networkName The name of the network (for filename)
   * @param options Download options
   * @param accessKey Optional access key for shared networks
   */
  const downloadNetwork = async (
    networkId: string,
    networkName: string,
    options: DownloadOptions = { format: 'CX2' },
    accessKey?: string
  ) => {
    try {
      // Set downloading state for this network
      setIsDownloading(prev => ({ ...prev, [networkId]: true }))
      
      let data
      let fileExtension
      
      // Choose download method based on format
      if (options.format === 'CX') {
        data = await downloadRawNetwork(networkId, accessKey)
        fileExtension = 'cx'
      } else {
        data = await downloadCX2Network(networkId, accessKey)
        fileExtension = 'cx2'
      }
      
      // Generate filename
      const filename = formatNetworkFilename(
        networkName || `network_${networkId}`,
        fileExtension
      )
      
      // Save the file
      saveAsFile(data, filename)
      
      return { success: true, networkId }
    } catch (error) {
      console.error(`Error downloading network ${networkId}:`, error)
      return { success: false, networkId, error }
    } finally {
      // Clear downloading state
      setIsDownloading(prev => {
        const newState = { ...prev }
        delete newState[networkId]
        return newState
      })
    }
  }

  /**
   * Download multiple networks
   * @param networkItems Array of networks with id and name
   * @param options Download options
   */
  const downloadMultipleNetworks = async (
    networkItems: Array<{ id: string; name: string; accessKey?: string }>,
    options: DownloadOptions = { format: 'CX2' }
  ) => {
    const results = {
      successful: [] as string[],
      failed: [] as { id: string; error: any }[]
    }
    
    // Download networks one by one
    for (const network of networkItems) {
      const result = await downloadNetwork(
        network.id,
        network.name,
        options,
        network.accessKey
      )
      
      if (result.success) {
        results.successful.push(network.id)
      } else {
        results.failed.push({ id: network.id, error: result.error })
      }
    }
    
    return results
  }

  return {
    downloadNetwork,
    downloadMultipleNetworks,
    isDownloading
  }
} 