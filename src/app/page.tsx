'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Home from '@/components/home/Home'
import MyAccount from '@/components/my-account/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'

/**
 * 
 * @returns The appropriate component based on the current route
 * @description This is the main page that handles all routing including folder routes
 * 
*/
export default function HomePage() {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  // Ensure we're on the client side to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return <div className="flex h-screen w-full items-center justify-center">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
    </div>
  }
  
  console.log('HomePage rendering with pathname:', pathname)
  
  // Check if this is a folder route
  const folderMatch = pathname?.match(/^\/folders\/([^\/]+)$/)
  if (folderMatch) {
    const uuid = folderMatch[1]
    console.log('Rendering folder page for UUID:', uuid)
    
    return (
      <MyAccount 
        tabState={MyAccountTabType.MYNETWORKS} 
        uuid={uuid}
      />
    )
  }
  
  // Default to home page
  console.log('Rendering home page')
  return <Home />
}
