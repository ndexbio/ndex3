'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, Home, Settings } from 'lucide-react'
import Link from 'next/link'

interface MyAccountErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error UI for My Account Page
 * 
 * Catches errors during account data fetching and provides recovery options.
 * Includes retry functionality and navigation alternatives.
 */
export default function MyAccountError({ error, reset }: MyAccountErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('My Account page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Account Data Unavailable</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t load your account information. This might be because:
          </p>
        </div>

        <div className="mb-6 text-sm text-muted-foreground space-y-1">
          <p>• Your session has expired</p>
          <p>• Network connectivity issues</p>
          <p>• Account service temporarily unavailable</p>
          <p>• Server maintenance in progress</p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={reset} 
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reload Account Data
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              asChild 
              variant="outline"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
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

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You may need to log in again if your session expired.
          </p>
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
