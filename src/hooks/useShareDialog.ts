import { useState } from 'react'
import { ShareableItem, UserPermission, VisibilityLevel } from '@/types/sharing'
import { Visibility } from '@js4cytoscape/ndex-client'

export const useShareDialog = () => {
  const [userPermissions, setUserPermissions] = useState<Map<string, UserPermission>>(new Map())
  const [visibility, setVisibility] = useState<VisibilityLevel | 'mixed'>(Visibility.PRIVATE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addUser = (user: UserPermission) => {
    setUserPermissions(prev => new Map(prev.set(user.username, user)))
  }

  const updateUserPermission = (username: string, permission: 'READ' | 'EDIT') => {
    setUserPermissions(prev => {
      const newMap = new Map(prev)
      const user = newMap.get(username)
      if (user) {
        newMap.set(username, { ...user, permission })
      }
      return newMap
    })
  }

  const removeUser = (username: string) => {
    setUserPermissions(prev => {
      const newMap = new Map(prev)
      newMap.delete(username)
      return newMap
    })
  }

  const setVisibilityLevel = (level: VisibilityLevel) => {
    setVisibility(level)
  }

  const reset = () => {
    setUserPermissions(new Map())
    setVisibility(Visibility.PRIVATE)
    setIsLoading(false)
    setError(null)
  }

  return {
    userPermissions,
    visibility,
    isLoading,
    error,
    addUser,
    updateUserPermission,
    removeUser,
    setVisibilityLevel,
    setIsLoading,
    setError,
    reset,
  }
}