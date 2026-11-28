import React from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'

interface UserAvatarProps {
  user?: {
    image?: string
    userName?: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-lg'
}

/**
 * UserAvatar component displays user profile image or fallback initials
 */
export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  // Generate initials from user name
  const getInitials = (): string => {
    if (!user) return '?'
    
    // Try display name first
    if (user.displayName) {
      const parts = user.displayName.trim().split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return parts[0][0].toUpperCase()
    }

    // Try first + last name
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase()
    }

    // Try first name only
    if (user.firstName) {
      return user.firstName[0].toUpperCase()
    }

    // Fall back to username
    if (user.userName) {
      return user.userName[0].toUpperCase()
    }

    return '?'
  }

  // Generate display name for alt text
  const getDisplayName = (): string => {
    if (user?.displayName) return user.displayName
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`
    if (user?.firstName) return user.firstName
    if (user?.userName) return user.userName
    return 'User'
  }

  const baseClasses = `inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ${sizeClasses[size]} ${className}`

  // If user has an image, try to display it
  if (user?.image) {
    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <Image
          src={user.image}
          alt={`${getDisplayName()}'s profile picture`}
          fill
          className="rounded-full object-cover"
          unoptimized // Since we're using static export
          onError={(e) => {
            // Hide the image and show fallback on error
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            if (target.nextSibling) {
              (target.nextSibling as HTMLElement).style.display = 'flex'
            }
          }}
        />
        {/* Fallback initials (hidden by default, shown on image error) */}
        <div className={`absolute inset-0 ${baseClasses}`} style={{ display: 'none' }}>
          {getInitials()}
        </div>
      </div>
    )
  }

  // No image - show initials with icon fallback
  const initials = getInitials()
  
  return (
    <div className={baseClasses}>
      {initials !== '?' ? (
        initials
      ) : (
        <User className={size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : size === 'lg' ? 'h-8 w-8' : 'h-12 w-12'} />
      )}
    </div>
  )
}