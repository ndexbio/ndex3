'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Home from '@/app/_components/Home'
import FolderViewer from '@/app/folders/_components/FolderViewer'

/**
 * Root Page with Static Export Compatibility
 * 
 * Handles client-side routing for dynamic routes that can't be pre-generated
 * in static export mode. In development, file-system routing works normally.
 * In production (static export), we need client-side detection for dynamic UUIDs.
 */
export default function HomePage() {
  const pathname = usePathname()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render until client-side hydration
  if (!isClient) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  // Handle folder routes that couldn't be statically generated
  const folderMatch = pathname?.match(/^\/folders\/([^\/]+)$/)
  if (folderMatch) {
    const uuid = folderMatch[1]
    // Skip if it's the placeholder (should use file-system routing)
    if (uuid !== 'placeholder') {
      console.log('Client-side folder route for UUID:', uuid)
      return <FolderViewer uuid={uuid} />
    }
  }

  // Handle legacy networkset routes
  const networksetMatch = pathname?.match(/^\/networkset\/([^\/]+)$/)
  if (networksetMatch) {
    const uuid = networksetMatch[1]
    console.log('Redirecting legacy networkset route to folders:', uuid)
    router.replace(`/folders/${uuid}`)
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    )
  }

  // Default home page
  return <Home />
}
