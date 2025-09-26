'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, UserPlus, Info, Search, Loader2 } from 'lucide-react'
import { ShareDialogProps, UserPermission, PermissionAction, VisibilityLevel } from '@/types/sharing'
import { updateMemberPermissions, removeMemberPermissions, updateVisibility, updateBulkVisibility, transferOwnership } from '@/lib/api/sharing'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { NDExUser, Visibility, NDExFileType } from '@js4cytoscape/ndex-client'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useFilePermissions } from '@/hooks/use-file-permissions'
import { useUserDetails } from '@/hooks/use-user-details'
import AccessLinkSection from './AccessLinkSection'
import PeopleWithAccessSection from './PeopleWithAccessSection'

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  items,
  mode,
  onSuccess,
}) => {
  const config = useConfig()
  const { token, user: currentUser } = useAuth()
  const [localUserPermissions, setLocalUserPermissions] = useState<Map<string, UserPermission>>(new Map())
  const [visibility, setVisibility] = useState<VisibilityLevel | 'mixed'>(Visibility.PRIVATE)
  const [newUserInput, setNewUserInput] = useState('')
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownershipTransferred, setOwnershipTransferred] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [showVisibilityInfo, setShowVisibilityInfo] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<NDExUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [accessLinkEnabled, setAccessLinkEnabled] = useState(false)
  const [changedVisibilityItems, setChangedVisibilityItems] = useState<Map<string, Visibility>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)
  const infoPopupRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // First, fetch permissions to get user UUIDs
  const {
    userPermissions: initialUserPermissions,
    userUuids,
    isLoading: isLoadingPermissions,
    error: permissionsError,
    hasData: hasPermissionsData,
  } = useFilePermissions(items, isOpen)

  // Then, fetch user details for those UUIDs
  const {
    userDetails,
    isLoadingUsers,
    userError,
  } = useUserDetails(userUuids, isOpen && hasPermissionsData)

  // Finally, get enriched permissions with user details
  const {
    userPermissions: fetchedUserPermissions,
  } = useFilePermissions(items, isOpen, userDetails)

  // Merge fetched permissions with local changes
  const mergedUserPermissions = useMemo(() => {
    const merged = new Map(fetchedUserPermissions)
    // Overlay local changes on top of fetched data
    localUserPermissions.forEach((localUser, key) => {
      merged.set(key, localUser)
    })
    return merged
  }, [fetchedUserPermissions, localUserPermissions])

  // Initialize dialog state when opened
  useEffect(() => {
    if (isOpen) {
      initializeDialogState()
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }, [isOpen, items])

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeDialogWithChanges()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, changedVisibilityItems, onSuccess])

  // Handle click outside for info popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoPopupRef.current && !infoPopupRef.current.contains(event.target as Node)) {
        setShowVisibilityInfo(false)
      }
    }

    if (showVisibilityInfo) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showVisibilityInfo])

  // Handle click outside for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showSuggestions])

  // Debounced search function
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      setIsSearching(true)
      const client = getNdexClient(config.ndexBaseUrl, token)

      const results = await client.user.searchUsers(query, 0, 20)
      console.log('Search users API response:', results)

      // Handle the case where the API returns a wrapper object with resultList
      let userArray: NDExUser[] = []
      if (Array.isArray(results)) {
        userArray = results
      } else if (results && typeof results === 'object' && 'resultList' in results) {
        userArray = (results as any).resultList || []
      }

      console.log('Processed user array:', userArray)
      setSearchSuggestions(userArray)
      setShowSuggestions(userArray.length > 0)
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsSearching(false)
    }
  }, [config.ndexBaseUrl, token])

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(newUserInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [newUserInput, searchUsers])

  const initializeDialogState = () => {
    // Reset local permissions (fetched permissions will be handled by the hook)
    setLocalUserPermissions(new Map())
    setVisibility(items.length === 1 ? (items[0].visibility || Visibility.PRIVATE) : 'mixed')
    setNewUserInput('')
    setSearchSuggestions([])
    setShowSuggestions(false)
    setAccessLinkEnabled(false)
    setError(null)
    setChangedVisibilityItems(new Map()) // Reset changed items tracker
  }

  const handlePermissionsRetry = () => {
    // SWR will automatically retry when we mutate the cache key
    // This is handled by the useFilePermissions hook
    setError(null)
  }

  // Combine errors from both hooks
  const combinedError = permissionsError || userError

  const handleSelectUser = async (user: NDExUser) => {
    const newUser: UserPermission = {
      userUuid: user.externalId, // User's UUID from NDEx API
      username: user.userName,   // Human-readable username
      email: user.emailAddress || user.userName, // Keep for compatibility but won't be displayed
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName,
      permission: 'READ' as const,
    }

    try {
      // Update local state first for immediate UI feedback
      setLocalUserPermissions(prev => new Map(prev.set(newUser.userUuid, newUser)))
      setNewUserInput('')
      setSearchSuggestions([])
      setShowSuggestions(false)
      setError(null)

      // Make immediate API call to add user with READ permission
      const client = getNdexClient(config.ndexBaseUrl, token)
      const newUserPermissions = new Map([[newUser.userUuid, newUser]])
      await updateMemberPermissions(client, items, newUserPermissions)

    } catch (error) {
      setError('Failed to add user')
      console.error('Error adding user:', error)

      // Revert local state on error
      setLocalUserPermissions(prev => {
        const newMap = new Map(prev)
        newMap.delete(newUser.userUuid)
        return newMap
      })
    }
  }

  const handleAddUser = async () => {
    if (!newUserInput.trim()) return

    // Users can only be added through search suggestions to ensure we have their UUID
    setError('Please select a user from the search suggestions')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddUser()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const handlePermissionChange = async (userUuid: string, action: PermissionAction) => {
    if (action === 'remove') {
      // Get the user for the API call
      const user = mergedUserPermissions.get(userUuid)
      if (!user) return

      // Immediately remove from permissions API
      try {
        const client = getNdexClient(config.ndexBaseUrl, token)
        await removeMemberPermissions(client, items, user.userUuid)
        setLocalUserPermissions(prev => {
          const newMap = new Map(prev)
          newMap.delete(userUuid)
          return newMap
        })
      } catch (error) {
        setError('Failed to remove user access')
        console.error('Error removing user access:', error)
      }
    } else if (action === 'read' || action === 'edit') {
      // Check if permission is actually changing
      const currentUser = mergedUserPermissions.get(userUuid)
      if (!currentUser) return

      const newPermission = action === 'read' ? 'READ' as const : 'EDIT' as const

      // Only make API call if permission is actually changing
      if (currentUser.permission !== newPermission) {
        try {
          // Update local state first for immediate UI feedback
          setLocalUserPermissions(prev => {
            const newMap = new Map(prev)
            const updatedUser = { ...currentUser, permission: newPermission }
            newMap.set(userUuid, updatedUser)
            return newMap
          })

          // Make immediate API call for the permission change
          const client = getNdexClient(config.ndexBaseUrl, token)
          const updatedUser = { ...currentUser, permission: newPermission }
          const updatedPermissions = new Map([[userUuid, updatedUser]])
          await updateMemberPermissions(client, items, updatedPermissions)

        } catch (error) {
          setError('Failed to update user permission')
          console.error('Error updating user permission:', error)

          // Revert local state on error
          setLocalUserPermissions(prev => {
            const newMap = new Map(prev)
            if (fetchedUserPermissions.has(userUuid)) {
              // Revert to original fetched permission
              newMap.delete(userUuid)
            } else {
              // Keep the original permission
              const originalUser = { ...currentUser, permission: currentUser.permission }
              newMap.set(userUuid, originalUser)
            }
            return newMap
          })
        }
      }
    } else if (action === 'transfer') {
      // Transfer ownership to the selected user
      const user = mergedUserPermissions.get(userUuid)
      if (!user) return

      try {
        const client = getNdexClient(config.ndexBaseUrl, token)
        await transferOwnership(client, items, user.userUuid)

        // Mark that ownership has been transferred
        setOwnershipTransferred(true)

        // Update local state to reflect the ownership change
        // We need to update ALL users' ownership status, so we'll set the complete new state
        const newLocalState = new Map<string, UserPermission>()

        // Process all current users and update their ownership status
        mergedUserPermissions.forEach((existingUser, existingUserUuid) => {
          if (existingUser.isOwner) {
            // Current owner becomes regular user with Edit permission
            newLocalState.set(existingUserUuid, {
              ...existingUser,
              isOwner: false,
              permission: 'EDIT'
            })
          } else if (existingUserUuid === userUuid) {
            // This user becomes the new owner
            newLocalState.set(existingUserUuid, {
              ...existingUser,
              isOwner: true,
              permission: 'EDIT'
            })
          } else {
            // Keep other users as they are
            newLocalState.set(existingUserUuid, existingUser)
          }
        })

        setLocalUserPermissions(newLocalState)

        console.log(`Successfully transferred ownership to ${user.username}`)
        console.log('Updated local permissions:', Array.from(newLocalState.entries()).map(([uuid, user]) => ({
          uuid,
          username: user.username,
          isOwner: user.isOwner,
          permission: user.permission
        })))
      } catch (error) {
        setError('Failed to transfer ownership')
        console.error('Error transferring ownership:', error)
      }
    }
    setOpenDropdownId(null)
  }

  const handleVisibilityChange = async (newVisibility: VisibilityLevel) => {
    const oldVisibility = visibility

    try {
      // Update local state first for immediate UI feedback
      setVisibility(newVisibility)
      setError(null)

      // Reset access link when visibility changes away from private
      if (newVisibility !== Visibility.PRIVATE) {
        setAccessLinkEnabled(false)
      }

      // Make immediate API call to update visibility
      const client = getNdexClient(config.ndexBaseUrl, token)

      if (items.length === 1) {
        // Single item update
        await updateVisibility(client, items[0].uuid, items[0].type, newVisibility)
        // Track this item as changed
        setChangedVisibilityItems(prev => new Map(prev.set(items[0].uuid, newVisibility)))
      } else {
        // Bulk update
        await updateBulkVisibility(client, items, newVisibility)
        // Track all items as changed
        setChangedVisibilityItems(prev => {
          const newMap = new Map(prev)
          items.forEach(item => {
            newMap.set(item.uuid, newVisibility)
          })
          return newMap
        })
      }

    } catch (error) {
      setError('Failed to update visibility')
      console.error('Error updating visibility:', error)

      // Revert local state on error
      setVisibility(oldVisibility)

      // Revert access link if it was changed
      if (oldVisibility === Visibility.PRIVATE && newVisibility !== Visibility.PRIVATE) {
        setAccessLinkEnabled(true)
      }
    }
  }

  const handleAccessLinkToggle = async (enabled: boolean) => {
    setAccessLinkEnabled(enabled)
    // The AccessLinkSection component handles the actual API calls
  }

  // Helper to notify parent of changes and close dialog
  const closeDialogWithChanges = () => {
    // Prepare update information for the parent component
    const updates: any[] = []

    // Add visibility changes
    if (changedVisibilityItems.size > 0) {
      updates.push(...Array.from(changedVisibilityItems.entries()).map(([uuid, visibility]) => ({
        uuid,
        visibility
      })))
    }

    // Check if ownership was transferred away from current user
    if (ownershipTransferred && currentUser) {
      // Find networks where the current user is no longer the owner
      const currentUserUuid = currentUser.externalId
      const transferredNetworks = items
        .filter(item => item.type === NDExFileType.NETWORK)
        .filter(() => {
          // Check if this network no longer has the current user as owner
          const userInPermissions = mergedUserPermissions.get(currentUserUuid)
          return !userInPermissions?.isOwner
        })

      if (transferredNetworks.length > 0) {
        updates.push({
          type: 'ownership_transferred',
          networks: transferredNetworks.map(network => network.uuid),
          currentUserUuid
        })
      }
    }

    // Notify parent if there are any updates
    if (updates.length > 0 && onSuccess) {
      onSuccess(updates)
    }

    // Close the dialog
    onClose()
  }

  const handleDone = () => {
    closeDialogWithChanges()
  }

  if (!isOpen) return null

  // Check if any items are shortcuts (when shortcuts are present, only show visibility settings)
  const hasShortcuts = items.some(item => item.type === NDExFileType.SHORTCUT)

  // Debug logging
  console.log('ShareDialog items:', items.map(item => ({ name: item.name, type: item.type })))
  console.log('hasShortcuts:', hasShortcuts)

  const dialogTitle = mode === 'single' && items.length === 1
    ? `Share "${items[0].name}"`
    : `Share ${items.length} items`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 dark:bg-gray-700 opacity-50"
        onClick={closeDialogWithChanges}
      />

      {/* Dialog box */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[500px] max-w-full z-10 max-h-[700px] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-normal text-gray-900 dark:text-gray-100">{dialogTitle}</h2>
          <button
            onClick={closeDialogWithChanges}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Add people section - hidden when shortcuts are present */}
          {!hasShortcuts && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add people</h3>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newUserInput}
                    onChange={(e) => setNewUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    placeholder="Enter email or username..."
                    className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 dark:border-gray-600"
                    disabled={isLoading}
                  />
                  {(isSearching || newUserInput.length >= 2) && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={isLoading || !newUserInput.trim()}
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>

              {/* User suggestions dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
                >
                  {searchSuggestions.map((user) => {
                    const hasAccess = mergedUserPermissions.has(user.externalId)
                    return (
                      <button
                        key={user.externalId}
                        onClick={() => !hasAccess && handleSelectUser(user)}
                        disabled={hasAccess}
                        title={hasAccess ? 'This user already has access' : ''}
                        className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 focus:outline-none ${
                          hasAccess
                            ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            hasAccess ? 'bg-gray-200 dark:bg-gray-600' : 'bg-blue-100 dark:bg-blue-900'
                          }`}>
                            <span className={`text-sm font-medium ${
                              hasAccess ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-300'
                            }`}>
                              {(user.firstName?.[0] || user.userName[0]).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm truncate ${
                              hasAccess ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.userName}
                              {hasAccess && <span className="ml-2 text-xs">(Already has access)</span>}
                            </div>
                            <div className={`text-xs truncate ${
                              hasAccess ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              @{user.userName} {user.emailAddress && user.emailAddress !== user.userName && `• ${user.emailAddress}`}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* No results message */}
              {showSuggestions && searchSuggestions.length === 0 && newUserInput.length >= 2 && !isSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    No users found. You can still add by email address.
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
          )}

          {/* People with access - hidden when shortcuts are present */}
          {!hasShortcuts && (
            <PeopleWithAccessSection
              userPermissions={mergedUserPermissions}
              isLoading={isLoadingPermissions || isLoadingUsers}
              error={combinedError}
              onRetry={handlePermissionsRetry}
              onPermissionChange={handlePermissionChange}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
            />
          )}

          {/* Visibility section */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Visibility</h3>
              <div className="relative" ref={infoPopupRef}>
                <button
                  onClick={() => setShowVisibilityInfo(!showVisibilityInfo)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                  type="button"
                >
                  <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>

              </div>
            </div>

            {/* Horizontal radio button group with rounded rectangle */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={Visibility.PRIVATE}
                    checked={visibility === Visibility.PRIVATE}
                    onChange={() => handleVisibilityChange(Visibility.PRIVATE)}
                    className="text-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Private</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={Visibility.PUBLIC}
                    checked={visibility === Visibility.PUBLIC}
                    onChange={() => handleVisibilityChange(Visibility.PUBLIC)}
                    className="text-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Public</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={Visibility.UNLISTED}
                    checked={visibility === Visibility.UNLISTED}
                    onChange={() => handleVisibilityChange(Visibility.UNLISTED)}
                    className="text-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unlisted</span>
                </label>
              </div>

              {visibility === 'mixed' && mode === 'bulk' && (
                <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Mixed visibility - select a setting to apply to all items
                </div>
              )}
            </div>

            {/* Access Link Section - hidden when shortcuts are present */}
            {!hasShortcuts && (
            <AccessLinkSection
              items={items}
              visibility={visibility}
              isEnabled={accessLinkEnabled}
              onToggle={handleAccessLinkToggle}
            />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>

      {/* Visibility Info Popup */}
      {showVisibilityInfo && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          {/* Info popup */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[550px] max-w-[90%] m-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visibility Options</h2>
              <button
                onClick={() => setShowVisibilityInfo(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-3 h-3 bg-gray-400 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-2">Private</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Only the owner and specifically invited users can view the content.
                      This setting provides the highest level of privacy - the item will not appear
                      in any search results (internal or external) and will not be visible on the
                      owner's public profile. Perfect for sensitive or personal content that should
                      only be accessible to selected collaborators.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-2">Public</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Anyone can discover and view the content. This setting makes your item fully
                      discoverable - it will appear in search results, can be found through search
                      engines, and will be displayed on your public profile. Use this setting when
                      you want maximum visibility and want to share your work with the broader community.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-2">Unlisted</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      Anyone with the direct link can view the content. This is a middle-ground option -
                      the item won't appear in search results or on your public profile, but anyone who
                      has the specific URL can access it. This is useful for sharing content with a
                      specific group without making it fully public, similar to sharing a private YouTube video.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowVisibilityInfo(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareDialog