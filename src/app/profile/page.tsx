'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/contexts/KeycloakContext'
//import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'

export default function ProfilePage() {
  const { isAuthenticated, token, tokenParsed, logout, isInitializing } =
    useAuth()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while Keycloak is still initializing
    if (isInitializing) {
      return
    }

    if (!isAuthenticated || !token) {
      router.push('/')
    }
  }, [isAuthenticated, token, router, isInitializing])

  if (isInitializing || !isAuthenticated || !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-lg">Authentication Status</h3>
            <p className="text-sm text-muted-foreground">
              You are currently authenticated with NDEx.
            </p>
          </div>

          {tokenParsed && (
            <div>
              <h3 className="font-medium text-lg">User Information</h3>
              <p className="text-sm text-muted-foreground">
                Username: {tokenParsed.preferred_username || 'Not available'}
              </p>
              <p className="text-sm text-muted-foreground">
                Email: {tokenParsed.email || 'Not available'}
              </p>
              <p className="text-sm text-muted-foreground">
                Name: {tokenParsed.name || 'Not available'}
              </p>
            </div>
          )}

          <div className="pt-4">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
