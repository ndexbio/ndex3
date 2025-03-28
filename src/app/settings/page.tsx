'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const { isAuthenticated, token } = useAuth()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [networkUpdates, setNetworkUpdates] = useState(true)
  const [collaborationRequests, setCollaborationRequests] = useState(true)

  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push('/')
    }
  }, [isAuthenticated, token, router])

  if (!isAuthenticated || !token) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium text-lg mb-4">
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="network-updates"
                  checked={networkUpdates}
                  onCheckedChange={setNetworkUpdates}
                />
                <Label htmlFor="network-updates">Network Updates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="collaboration-requests"
                  checked={collaborationRequests}
                  onCheckedChange={setCollaborationRequests}
                />
                <Label htmlFor="collaboration-requests">
                  Collaboration Requests
                </Label>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button className="w-full sm:w-auto">Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
