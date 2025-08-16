'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

interface TrashErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function TrashError({ error, reset }: TrashErrorProps) {
  useEffect(() => {
    console.error('Trash page error:', error)
  }, [error])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Trash Unavailable</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t load your trash contents.
        </p>
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/my-account">
              <Home className="h-4 w-4 mr-2" />
              My Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
