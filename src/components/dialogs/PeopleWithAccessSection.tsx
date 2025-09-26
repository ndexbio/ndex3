'use client'

import React, { useEffect, useRef } from 'react'
import { ChevronDown, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { UserPermission, PermissionAction } from '@/types/sharing'

interface PeopleWithAccessSectionProps {
  userPermissions: Map<string, UserPermission>
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onPermissionChange: (username: string, action: PermissionAction) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
}

const PermissionsSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 animate-pulse">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-1"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    ))}
  </div>
)

const PermissionsError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex items-center justify-between px-3 py-4 border border-red-200 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/20">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
      <span className="text-sm text-red-700 dark:text-red-300">Unable to load permissions</span>
    </div>
    <button
      onClick={onRetry}
      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
    >
      <RefreshCw className="h-3 w-3" />
      Retry
    </button>
  </div>
)

const PermissionsList: React.FC<{
  userPermissions: Map<string, UserPermission>
  onPermissionChange: (username: string, action: PermissionAction) => void
  openDropdownId: string | null
  setOpenDropdownId: (id: string | null) => void
}> = ({ userPermissions, onPermissionChange, openDropdownId, setOpenDropdownId }) => {
  if (userPermissions.size === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">No users have explicit permissions</p>
    )
  }

  // Sort users with owner first, then alphabetically by username
  const sortedUsers = Array.from(userPermissions.values()).sort((a, b) => {
    // Owner comes first
    if (a.isOwner && !b.isOwner) return -1
    if (!a.isOwner && b.isOwner) return 1
    // Then sort alphabetically by username
    return a.username.localeCompare(b.username)
  })

  return (
    <div className="space-y-1">
      {sortedUsers.map((user) => (
        <div key={user.userUuid} className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
              {user.username}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
              {user.fullName}
              {user.isOwner && <span className="ml-2 text-blue-600 dark:text-blue-400">(Owner)</span>}
            </div>
          </div>
          {!user.isOwner && (
            <div className="relative ml-3 flex-shrink-0">
              <button
                onClick={() => setOpenDropdownId(openDropdownId === user.userUuid ? null : user.userUuid)}
                className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                data-dropdown-trigger
              >
                {user.permission === 'READ' ? 'Read' : user.permission === 'EDIT' ? 'Edit' : 'Mixed'}
                <ChevronDown className="h-4 w-4" />
              </button>

              {openDropdownId === user.userUuid && (
                <div
                  data-dropdown
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10 min-w-[180px]"
                >
                  <button
                    onClick={() => onPermissionChange(user.userUuid, 'read')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                  >
                    <span className="w-4 text-center flex-shrink-0">{user.permission === 'READ' && '✓'}</span>
                    <span className="ml-2">Read</span>
                  </button>
                  <button
                    onClick={() => onPermissionChange(user.userUuid, 'edit')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100"
                  >
                    <span className="w-4 text-center flex-shrink-0">{user.permission === 'EDIT' && '✓'}</span>
                    <span className="ml-2">Edit</span>
                  </button>
                  <hr className="my-1 border-gray-300 dark:border-gray-600" />
                  <button
                    onClick={() => onPermissionChange(user.userUuid, 'transfer')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    Transfer ownership
                  </button>
                  <button
                    onClick={() => onPermissionChange(user.userUuid, 'remove')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                  >
                    Remove access
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const PeopleWithAccessSection: React.FC<PeopleWithAccessSectionProps> = ({
  userPermissions,
  isLoading,
  error,
  onRetry,
  onPermissionChange,
  openDropdownId,
  setOpenDropdownId,
}) => {
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if the click is outside any dropdown
      if (!target.closest('[data-dropdown]') && !target.closest('[data-dropdown-trigger]')) {
        setOpenDropdownId(null)
      }
    }

    // Handle escape key to close dropdown only
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openDropdownId) {
        event.preventDefault() // Prevent default escape behavior
        event.stopPropagation() // Stop the event from bubbling up
        event.stopImmediatePropagation() // Stop other listeners on the same element
        setOpenDropdownId(null)
      }
    }

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey, true) // Use capture to handle first
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey, true)
    }
  }, [openDropdownId, setOpenDropdownId])
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">People with access</h3>
        {isLoading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
      </div>

      {isLoading ? (
        <PermissionsSkeleton />
      ) : error ? (
        <PermissionsError onRetry={onRetry} />
      ) : (
        <PermissionsList
          userPermissions={userPermissions}
          onPermissionChange={onPermissionChange}
          openDropdownId={openDropdownId}
          setOpenDropdownId={setOpenDropdownId}
        />
      )}
    </div>
  )
}

export default PeopleWithAccessSection