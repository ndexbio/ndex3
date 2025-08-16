'use client'

import React from 'react'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import MyAccount from '@/app/my-account/_components/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'

interface FolderViewerProps {
  uuid?: string
}

/**
 * FolderViewer Component
 * 
 * Smart folder viewer that provides different experiences based on authentication:
 * - Authenticated users: Full MyAccount experience with all management features
 * - Anonymous users: Simplified public folder viewer (read-only)
 */
export default function FolderViewer({ uuid }: FolderViewerProps) {
  const { isAuthenticated } = useAuth()

  // Handle placeholder UUID from static generation
  if (!uuid || uuid === 'placeholder') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Folder Not Found</h1>
          <p className="text-muted-foreground">
            The requested folder could not be found or may not be publicly accessible.
          </p>
        </div>
      </div>
    )
  }

  // Authenticated users get the full MyAccount experience
  if (isAuthenticated) {
    return (
      <MyAccount 
        tabState={MyAccountTabType.MYNETWORKS} 
        uuid={uuid}
      />
    )
  }

  // Anonymous users get the simplified public viewer
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Public Folder</h1>
        <p className="text-muted-foreground mt-2">
          Viewing contents of folder: {uuid}
        </p>
      </div>
      
      {/* TODO: Implement public folder content display */}
      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Public Folder Viewer</h2>
        <p className="text-muted-foreground mb-4">
          This component will display public folder contents for UUID: <code className="bg-muted px-2 py-1 rounded text-sm">{uuid}</code>
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Anonymous access (read-only)</p>
          <p>• <strong>Sign in for full folder management features</strong></p>
          <p>• Public folder sharing supported</p>
        </div>
      </div>
    </div>
  )
}
