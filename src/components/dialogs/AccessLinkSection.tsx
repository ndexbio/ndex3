'use client'

import React, { useState } from 'react'
import { Copy, Check, Loader2 } from 'lucide-react'
import { ShareableItem, VisibilityLevel } from '@/types/sharing'
import { generateAccessKeys, revokeAccessKeys, constructShareableUrl, copyToClipboard } from '@/lib/api/sharing'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { Visibility, NDExFileType } from '@js4cytoscape/ndex-client'

interface AccessLinkSectionProps {
  items: ShareableItem[]
  visibility: VisibilityLevel | 'mixed'
  isEnabled: boolean
  onToggle: (enabled: boolean) => Promise<void>
}

const AccessLinkSection: React.FC<AccessLinkSectionProps> = ({
  items,
  visibility,
  isEnabled,
  onToggle
}) => {
  const config = useConfig()
  const { token } = useAuth()
  const [accessKeys, setAccessKeys] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})

  // Only show for private visibility and single items (networks or folders)
  const shouldShow = visibility === Visibility.PRIVATE && items.length === 1

  if (!shouldShow) {
    return null
  }

  const handleToggle = async (checked: boolean) => {
    try {
      setIsGenerating(true)
      setError(null)

      if (checked) {
        // Generate access keys
        const client = getNdexClient(config.ndexBaseUrl, token)
        const keys = await generateAccessKeys(client, items)
        setAccessKeys(keys)
      } else {
        // Revoke access keys
        const client = getNdexClient(config.ndexBaseUrl, token)
        await revokeAccessKeys(client, items)
        setAccessKeys({})
      }

      await onToggle(checked)
    } catch (err) {
      setError(checked ? 'Failed to generate access link' : 'Failed to revoke access link')
      console.error('Access link toggle error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async (itemUuid: string) => {
    const accessKey = accessKeys[itemUuid]
    if (!accessKey) return

    const item = items[0]
    const shareableUrl = item.type === NDExFileType.NETWORK
      ? constructShareableUrl(config.ndexBaseUrl, itemUuid, accessKey)
      : `${config.ndexBaseUrl}/viewer/folders/${itemUuid}?accesskey=${accessKey}`

    const success = await copyToClipboard(shareableUrl)

    if (success) {
      setCopiedStates(prev => ({ ...prev, [itemUuid]: true }))
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [itemUuid]: false }))
      }, 2000)
    }
  }

  const item = items[0] // Single item only
  const hasAccessKey = accessKeys[item.uuid]

  return (
    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          id="anyone-with-link"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={isGenerating}
          className="text-blue-500"
        />
        <label htmlFor="anyone-with-link" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          Anyone with the link
        </label>
        {isGenerating && (
          <Loader2 className="h-4 w-4 text-gray-400 dark:text-gray-500 animate-spin" />
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Only available when visibility is Private
      </p>

      {isEnabled && hasAccessKey && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={item.type === NDExFileType.NETWORK
                  ? constructShareableUrl(config.ndexBaseUrl, item.uuid, accessKeys[item.uuid])
                  : `${config.ndexBaseUrl}/viewer/folders/${item.uuid}?accesskey=${accessKeys[item.uuid]}`
                }
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-16"
              />
            </div>
            <button
              onClick={() => handleCopyLink(item.uuid)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm flex items-center gap-1"
              disabled={!hasAccessKey}
            >
              {copiedStates[item.uuid] ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}

export default AccessLinkSection