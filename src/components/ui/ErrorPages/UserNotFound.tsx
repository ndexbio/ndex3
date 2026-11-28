import React from 'react'
import Link from 'next/link'
import { UserX, Home, ArrowLeft } from 'lucide-react'

interface UserNotFoundProps {
  userUuid?: string
}

export function UserNotFound({ userUuid }: UserNotFoundProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <UserX className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">User Not Found</h1>
          <p className="text-muted-foreground">
            The user profile you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          {userUuid && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              UUID: {userUuid}
            </p>
          )}
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
          <p>If you believe this is an error, please try:</p>
          <ul className="mt-2 space-y-1 text-left">
            <li>• Checking the URL for typos</li>
            <li>• Refreshing the page</li>
            <li>• Contacting the user directly</li>
          </ul>
        </div>
      </div>
    </div>
  )
}