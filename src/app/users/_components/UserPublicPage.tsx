'use client'

import React, { useState, useEffect } from 'react'
import { useUserProfile } from '@/hooks/use-user-profile'
import { useUserHomeContent } from '@/hooks/use-user-home-content'
import UserProfileSidebar from './UserProfileSidebar'
import UserContent from './UserContent'
import { UserNotFound } from '@/components/ui/ErrorPages/UserNotFound'
import { PrivateProfile } from '@/components/ui/ErrorPages/PrivateProfile'
import { UserPublicPageProps } from '@/types/ui/userProfile'

export default function UserPublicPage({ uuid }: UserPublicPageProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Fetch user profile
  const { user, isLoading: isLoadingUser, error: userError } = useUserProfile(uuid)

  // Fetch user content (public only)
  const { 
    content, 
    isLoading: isLoadingContent 
  } = useUserHomeContent(uuid, false) // false = public content only

  // Set page title based on user data
  useEffect(() => {
    if (user) {
      const displayName = user.displayName || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName) ||
        user.userName || 
        'User'
      document.title = `${displayName} - NDEx3`
    } else {
      document.title = 'User Profile - NDEx3'
    }

    return () => {
      document.title = 'NDEx3' // Reset title when component unmounts
    }
  }, [user])

  // Handle error states
  if (userError) {
    if (userError.type === 'NOT_FOUND') {
      return <UserNotFound userUuid={uuid} />
    }
    
    if (userError.type === 'PRIVATE') {
      return <PrivateProfile userUuid={uuid} userName={user?.userName} />
    }
    
    // Handle other errors (network, unauthorized, etc.)
    if (userError.type === 'NETWORK_ERROR' || userError.type === 'UNKNOWN') {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Unable to Load Profile</h1>
            <p className="text-muted-foreground">
              There was an error loading this user profile. Please try again later.
            </p>
            <p className="text-sm text-destructive">
              Error: {userError.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
  }

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading user profile...</p>
        </div>
      </div>
    )
  }

  // If we have user data, render the profile page
  return (
    <div className="flex gap-x-4 p-2" style={{ height: 'calc(100vh - 56px)' }}>
      {/* User Profile Sidebar */}
      <UserProfileSidebar
        user={user}
        isLoading={isLoadingUser}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex h-full overflow-hidden">
        <UserContent
          content={content}
          isLoading={isLoadingContent}
          userName={user?.userName}
        />
      </div>
    </div>
  )
}

// Export a wrapped version that handles the UUID parameter
export function UserPublicPageWrapper({ params }: { params: { uuid: string } }) {
  return <UserPublicPage uuid={params.uuid} />
}