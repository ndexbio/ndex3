'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, User, ExternalLink } from 'lucide-react'
import { UserProfileData } from '@/types/ui/userProfile'

interface UserProfileSidebarProps {
  user?: UserProfileData
  isLoading?: boolean
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function UserProfileSidebar({
  user,
  isLoading,
  collapsed,
  setCollapsed,
}: UserProfileSidebarProps) {
  // Generate display name
  const getDisplayName = (): string => {
    if (!user) return ''
    if (user.displayName) return user.displayName
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
    if (user.firstName) return user.firstName
    return user.userName || ''
  }

  // Format join date
  const getJoinDate = (): string => {
    if (!user?.creationTime) return ''
    const date = new Date(user.creationTime)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  return (
    <nav
      className={`${
        collapsed ? 'w-16' : 'w-72'
      } bg-card border border-border p-4 flex flex-col transition-all duration-300 relative rounded-md`}
      style={{ height: 'calc(100vh - 72px)' }}
    >
      {/* Collapse/Expand Button */}
      <div className="absolute -right-3 top-15 z-10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full bg-card p-1 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Profile Section */}
      <div className={`flex flex-col ${collapsed ? 'items-center space-y-2' : 'space-y-4'} mb-6`}>
        {isLoading ? (
          // Loading state
          <>
            <div className={`${collapsed ? 'w-12 h-12' : 'w-full h-32'} bg-muted animate-pulse ${collapsed ? 'rounded-full' : 'rounded-md'}`} />
            {!collapsed && (
              <>
                <div className="w-32 h-4 bg-muted animate-pulse rounded" />
                <div className="w-24 h-3 bg-muted animate-pulse rounded" />
                <div className="w-full h-16 bg-muted animate-pulse rounded" />
              </>
            )}
          </>
        ) : user ? (
          // User data
          <>
            {/* User Image - With aspect ratio preserved and max height */}
            <div className={`${collapsed ? 'w-12 h-12 rounded-full' : 'w-full max-h-32 rounded-md'} overflow-hidden bg-muted flex items-center justify-center`}>
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={getDisplayName()}
                  className={`${collapsed ? 'w-full h-full rounded-full object-cover' : 'max-w-full max-h-32 w-auto h-auto'} object-contain`}
                  onError={(e) => {
                    // Fallback to default avatar on image load error
                    e.currentTarget.style.display = 'none'
                    const nextSibling = e.currentTarget.nextElementSibling as HTMLElement
                    if (nextSibling) {
                      nextSibling.style.display = 'flex'
                    }
                  }}
                />
              ) : null}
              {/* Fallback avatar */}
              <div 
                className={`${user.image ? 'hidden' : 'flex'} items-center justify-center w-full h-full bg-muted text-muted-foreground`}
                style={user.image ? { display: 'none' } : {}}
              >
                <User className={collapsed ? 'h-6 w-6' : 'h-12 w-12'} />
              </div>
            </div>
            
            {!collapsed && (
              <div className="space-y-3 w-full">
                {/* Username */}
                <div className="text-center">
                  <h3 className="font-medium text-foreground text-base">
                    @{user.userName || 'Unknown'}
                  </h3>
                </div>

                {/* First Name and Last Name */}
                {(user.firstName || user.lastName) && (
                  <div className="text-center">
                    <h2 className="font-semibold text-foreground text-lg leading-tight">
                      {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                    </h2>
                  </div>
                )}

                {/* Description with HTML support */}
                {user.description && (
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <div 
                      className="break-words"
                      dangerouslySetInnerHTML={{ __html: user.description }}
                    />
                  </div>
                )}

                {/* Website */}
                {user.website && (
                  <div className="text-sm">
                    <a
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="break-all">{user.website}</span>
                    </a>
                  </div>
                )}

                {/* Account Creation Time */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  <p>Joined {getJoinDate()}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          // Error/empty state
          <>
            <div className={`${collapsed ? 'w-12 h-12 rounded-full' : 'w-full h-32 rounded-md'} bg-muted flex items-center justify-center`}>
              <User className={collapsed ? 'h-6 w-6' : 'h-12 w-12'} color="currentColor" />
            </div>
            {!collapsed && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">User not found</p>
              </div>
            )}
          </>
        )}
      </div>


      {/* Collapsed mode - show minimal info */}
      {collapsed && user && (
        <div className="mt-auto flex justify-center">
          <div className="text-xs text-muted-foreground text-center">
            <p>👤</p>
          </div>
        </div>
      )}
    </nav>
  )
}