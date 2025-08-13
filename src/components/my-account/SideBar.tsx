'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import NewFolderDialog from './NewFolderDialog'
import ImportNetworkDialog from './ImportNetworkDialog'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useFolder } from '@/hooks/use-folder'

import {
  Folder,
  Users,
  Trash,
  Plus,
  File,
  Home,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { MyAccountTabType } from '@/types/ui/myAccount'

interface SideBarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  currentFolderId?: string | null
  activeView?: MyAccountTabType
}

// Utility function to format storage information
const formatStorageInfo = (diskUsed: number, diskQuota: number) => {
  const oneMB = 1024.0 * 1024.0
  const oneGB = 1024.0 * 1024.0 * 1024.0
  const oneTB = 1024.0 * 1024.0 * 1024.0 * 1024.0

  let formattedUsed = ''
  let formattedTotal = ''
  let percentageUsed = 0

  // Format disk used
  if (diskUsed < oneGB) {
    // Used less than 1 GB
    const usedMB = diskUsed / oneMB
    let usedRounded = +usedMB.toFixed(1)
    if (usedRounded === 0 && diskUsed > 0) {
      usedRounded = 0.1
    }
    formattedUsed = `${usedRounded} MB`
  } else if (diskUsed >= oneGB && diskUsed < oneTB) {
    // Used between 1 GB and 1 TB
    const usedGB = diskUsed / oneGB
    const usedRounded = +usedGB.toFixed(2)
    formattedUsed = `${usedRounded} GB`
  } else {
    // Used more than 1 TB
    const usedTB = diskUsed / oneTB
    const usedRounded = +usedTB.toFixed(3)
    formattedUsed = `${usedRounded} TB`
  }

  // Format disk quota
  if (diskQuota <= 0) {
    // Unlimited quota
    formattedTotal = 'Unlimited'
    percentageUsed = 0 // No percentage for unlimited
  } else if (diskQuota < oneGB) {
    // Quota less than 1 GB
    const quotaMB = diskQuota / oneMB
    const quotaRounded = +quotaMB.toFixed(1)
    formattedTotal = `${quotaRounded} MB`
    percentageUsed = (diskUsed / diskQuota) * 100
  } else if (diskQuota >= oneGB && diskQuota < oneTB) {
    // Quota between 1 GB and 1 TB
    const quotaGB = diskQuota / oneGB
    const quotaRounded = +quotaGB.toFixed(1)
    formattedTotal = `${quotaRounded} GB`
    percentageUsed = (diskUsed / diskQuota) * 100
  } else {
    // Quota more than 1 TB
    const quotaTB = diskQuota / oneTB
    const quotaRounded = +quotaTB.toFixed(1)
    formattedTotal = `${quotaRounded} TB`
    percentageUsed = (diskUsed / diskQuota) * 100
  }

  // Round percentage
  percentageUsed = +percentageUsed.toFixed(1)

  // Adjust percentage for display
  if (percentageUsed === 0.0 && diskUsed > 0) {
    percentageUsed = 0.1
  }

  // Determine progress bar color class based on percentage used
  let progressBarColorClass = 'bg-sky-700' // Default color
  if (percentageUsed <= 25) {
    progressBarColorClass = 'bg-emerald-500' // Green for low usage
  } else if (percentageUsed <= 50) {
    progressBarColorClass = 'bg-sky-600' // Blue for medium usage
  } else if (percentageUsed <= 75) {
    progressBarColorClass = 'bg-amber-500' // Yellow for high usage
  } else {
    progressBarColorClass = 'bg-red-500' // Red for very high usage
  }

  return {
    formattedUsed,
    formattedTotal,
    percentageUsed,
    progressBarColorClass,
    formattedString: `${formattedUsed} of ${formattedTotal} used`,
  }
}

export default function SideBar({
  collapsed,
  setCollapsed,
  currentFolderId = null,
  activeView = MyAccountTabType.MYNETWORKS,
}: SideBarProps) {
  const [showNewOptions, setShowNewOptions] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const config = useConfig()
  const { token, diskUsed, diskQuota } = useAuth()
  const { createFolder } = useFolder()

  // Format storage information
  const storageInfo = formatStorageInfo(diskUsed, diskQuota)

  const toggleNewOptions = () => {
    setShowNewOptions(!showNewOptions)
  }

  // Handle clicks outside of the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the dropdown is open and the click is outside both the dropdown and the button
      if (
        showNewOptions &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowNewOptions(false)
      }
    }

    // Add event listener when the dropdown is open
    if (showNewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNewOptions])

  // Handle folder creation
  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name, currentFolderId)
      // No need to reload the page as the hook handles cache invalidation
    } catch (error) {
      console.error('Error creating folder:', error)
      throw error
    }
  }

  // Handle network import
  const handleImportNetwork = async (file: File, makePublic: boolean) => {
    try {
      // Read the file content
      const fileContent = await readFileAsJson(file)

      // Get NDEx client
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)

      // Import the network
      const result = await ndexClient.createNetworkFromRawCX2(
        fileContent,
        makePublic,
      )

      // Reload the page to refresh the network list
      window.location.reload()

      return result
    } catch (error) {
      console.error('Error importing network:', error)
      throw error
    }
  }

  // Helper function to read file as JSON
  const readFileAsJson = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          resolve(json)
        } catch (error) {
          reject(new Error('Invalid JSON file'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Error reading file'))
      }

      reader.readAsText(file)
    })
  }

  return (
    <nav
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } h-full bg-card border border-border p-4 flex flex-col transition-all duration-300 relative rounded-md`}
    >
      <div className="absolute -right-3 top-15 z-10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full bg-card p-1 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* New Button */}
      <div
        className={`mb-6 relative ${collapsed ? 'flex justify-center' : ''}`}
      >
        <button
          ref={buttonRef}
          onClick={toggleNewOptions}
          className={`flex items-center gap-2 py-2 ${
            collapsed ? 'px-3' : 'px-6'
          } bg-muted text-foreground rounded-full shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors`}
        >
          <Plus className="h-5 w-5" />
          {!collapsed && <span className="font-medium">New</span>}
        </button>

        {showNewOptions && (
          <div
            ref={dropdownRef}
            className={`absolute ${
              collapsed ? 'left-16' : 'left-0'
            } mt-2 w-48 bg-popover rounded-md shadow-lg z-10 border border-border`}
          >
            <div className="py-1">
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                onClick={() => {
                  setShowImportDialog(true)
                  setShowNewOptions(false)
                }}
              >
                <File className="h-4 w-4" />
                Upload Networks
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground w-full text-left transition-colors"
                onClick={() => {
                  setShowFolderDialog(true)
                  setShowNewOptions(false)
                }}
              >
                <Folder className="h-4 w-4" />
                New folder
              </button>
            </div>
          </div>
        )}
      </div>
      {/* 
      Active tab: text-sky-700
      Inactive tab: text-gray-700       
      */}
      {/* Navigation Items */}
      <ul className="space-y-2 mt-5">
        <li>
          <Link
            href="/my-account"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md transition-colors ${
              activeView === MyAccountTabType.MYNETWORKS
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            }`}
          >
            <Folder className="h-5 w-5" />
            {!collapsed && (
              <>
                <span>My Networks</span>
              </>
            )}
          </Link>
        </li>

        <li>
          <Link
            href="/shared-with-me"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md transition-colors ${
              activeView === MyAccountTabType.SHARED
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            }`}
          >
            <Users className="h-5 w-5" />
            {!collapsed && <span>Shared with me</span>}
          </Link>
        </li>
        <li>
          <Link
            href="/trash"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md transition-colors ${
              activeView === MyAccountTabType.TRASH
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
            }`}
          >
            <Trash className="h-5 w-5" />
            {!collapsed && <span>Trash</span>}
          </Link>
        </li>
      </ul>

      {/* Storage indicator */}
      {!collapsed && (
        <div className="mt-auto pt-4">
          <div className="flex items-center text-sm text-foreground mb-1">
            <span>Storage ({storageInfo.percentageUsed}% full)</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mb-1">
            <div
              className={`${storageInfo.progressBarColorClass} h-2 rounded-full`}
              style={{ width: `${storageInfo.percentageUsed}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {storageInfo.formattedString}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="mt-auto flex justify-center">
          <div
            className={`rounded-xl ${
              storageInfo.percentageUsed > 75
                ? 'bg-red-100 dark:bg-red-900/20'
                : storageInfo.percentageUsed > 50
                ? 'bg-amber-100 dark:bg-amber-900/20'
                : storageInfo.percentageUsed > 25
                ? 'bg-sky-100 dark:bg-sky-900/20'
                : 'bg-emerald-100 dark:bg-emerald-900/20'
            } p-1 pb-2`}
          >
            <span className="text-xs text-foreground">
              {storageInfo.percentageUsed}%
            </span>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      <NewFolderDialog
        isOpen={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* Import Network Dialog */}
      <ImportNetworkDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportNetwork={handleImportNetwork}
      />
    </nav>
  )
}
