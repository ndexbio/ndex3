'use client'

import React from 'react'
import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

interface PageNotFoundProps {
  /** The path the visitor asked for, echoed so they can spot a typo. */
  path?: string
}

/**
 * Shown when the requested URL matches no route in this app.
 *
 * This renders in place, at the URL the visitor typed — it does not redirect.
 * The address bar is the most useful thing on the screen for someone who
 * mistyped a link, and a redirect would throw it away. See
 * `docs/not-found-routing.md`.
 */
export function PageNotFound({ path }: PageNotFoundProps) {
  return (
    <div
      className="flex h-full min-h-96 w-full items-center justify-center bg-background"
      data-testid="page-not-found"
    >
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">
            This URL doesn&apos;t exist on this server.
          </p>
          {path && (
            <p
              className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded break-all"
              data-testid="page-not-found-path"
            >
              {path}
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
            <li>• Searching for the network or folder you wanted</li>
            <li>• Going back to the home page</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
