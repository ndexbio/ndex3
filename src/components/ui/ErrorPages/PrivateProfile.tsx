import React from 'react'
import Link from 'next/link'
import { Lock, Home, ArrowLeft, Eye } from 'lucide-react'

interface PrivateProfileProps {
  userUuid?: string
  userName?: string
}

export function PrivateProfile({ userUuid, userName }: PrivateProfileProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Private Profile</h1>
          <p className="text-muted-foreground">
            {userName 
              ? `${userName}&apos;s profile is set to private and cannot be viewed publicly.`
              : 'This user profile is set to private and cannot be viewed publicly.'
            }
          </p>
          {userUuid && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              UUID: {userUuid}
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4 text-left">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                About Private Profiles
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                Users can choose to keep their profiles private. This means their profile 
                information and content are only visible to themselves when signed in.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <div className="text-sm text-muted-foreground">
          <p>If you know this user, you can:</p>
          <ul className="mt-2 space-y-1 text-left">
            <li>• Contact them directly to view their content</li>
            <li>• Ask them to make their profile public</li>
            <li>• Search for their public networks on the main site</li>
          </ul>
        </div>
      </div>
    </div>
  )
}