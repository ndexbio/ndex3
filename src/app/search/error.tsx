'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

interface SearchErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error UI for Search Page
 * 
 * Catches errors during search operations and provides recovery options.
 * Includes retry functionality and navigation back to home.
 */
export default function SearchError({ error, reset }: SearchErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Search page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Search Unavailable</h1>
          <p className="text-muted-foreground">
            We encountered an error while performing your search. This could be due to:
          </p>
        </div>

        <div className="mb-6 text-sm text-muted-foreground space-y-1">
          <p>• Search service temporarily unavailable</p>
          <p>• Network connectivity issues</p>
          <p>• Invalid search parameters</p>
          <p>• Server overload or maintenance</p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={reset} 
            className="w-full"
            variant="default"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Search Again
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="w-full"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Link>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Try simplifying your search terms or check your network connection.
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
