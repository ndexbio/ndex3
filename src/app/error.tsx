'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global Error UI
 * 
 * Fallback error component for the entire app.
 * Catches any unhandled errors that bubble up from the app.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Global app error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto text-center px-4">
            <div className="mb-6">
              <AlertTriangle className="h-20 w-20 text-destructive mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Something went wrong!</h1>
              <p className="text-muted-foreground">
                We encountered an unexpected error. This could be due to a temporary issue.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={reset} 
                className="w-full"
                size="lg"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try again
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Link>
              </Button>
            </div>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                If this problem persists, please contact support or try refreshing your browser.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs bg-muted p-3 rounded border overflow-auto whitespace-pre-wrap">
                  {error.message}
                  {error.digest && `\nDigest: ${error.digest}`}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
