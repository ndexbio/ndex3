'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, Home, Search } from 'lucide-react'
import Link from 'next/link'

interface UserErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error UI for Dynamic User Profile Pages
 * 
 * Catches errors during user profile fetching and provides recovery options.
 * Includes retry functionality and navigation alternatives.
 */
export default function UserError({ error, reset }: UserErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('User profile error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">User Profile Unavailable</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t load this user profile. This might be because:
          </p>
        </div>

        <div className="mb-6 text-sm text-muted-foreground space-y-1">
          <p>• The user account doesn&apos;t exist</p>
          <p>• The profile is set to private</p>
          <p>• Network connectivity issues</p>
          <p>• Temporary server problems</p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={reset} 
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              asChild 
              variant="outline"
            >
              <Link href="/search">
                <Search className="h-4 w-4 mr-2" />
                Search Users
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline"
            >
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs bg-muted p-3 rounded border overflow-auto">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
