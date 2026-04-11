'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { getNdexClient } from '@/lib/api/ndex-client-manager'
import { useToast } from '@/lib/contexts/ToastContext'
import { Pencil, KeyRound } from 'lucide-react'

export default function SettingsPage() {
  const { isAuthenticated, token, user, isInitializing, refreshUser } = useAuth()
  const config = useConfig()
  const { addToast } = useToast()
  const router = useRouter()

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [networkUpdates, setNetworkUpdates] = useState(true)
  const [collaborationRequests, setCollaborationRequests] = useState(true)

  // Edit profile dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    emailAddress: '',
    website: '',
    image: '',
    description: '',
  })

  // Change password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')

  // Populate edit form when dialog opens
  useEffect(() => {
    if (editDialogOpen && user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        emailAddress: user.emailAddress || '',
        website: user.website || '',
        image: (user as any).image || '',
        description: user.description || '',
      })
    }
  }, [editDialogOpen, user])

  // Reset password form when dialog opens/closes
  useEffect(() => {
    if (!passwordDialogOpen) {
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setPasswordError('')
    }
  }, [passwordDialogOpen])

  useEffect(() => {
    if (isInitializing) return
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

  const handleSaveProfile = async () => {
    if (!user?.externalId) return

    setIsSaving(true)
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.user.updateCurrentUser({
        externalId: user.externalId,
        userName: user.userName,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        emailAddress: editForm.emailAddress,
        website: editForm.website,
        image: editForm.image,
        description: editForm.description,
      })

      await refreshUser()

      addToast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully',
        type: 'success',
        duration: 3000,
      })
      setEditDialogOpen(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      addToast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        type: 'error',
        duration: 4000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user?.externalId) return

    // Validation
    if (!passwordForm.newPassword) {
      setPasswordError('Password is required')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordError('')
    setIsChangingPassword(true)
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      await ndexClient.user.resetPassword(user.externalId, passwordForm.newPassword)

      addToast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
        type: 'success',
        duration: 3000,
      })
      setPasswordDialogOpen(false)
    } catch (error: any) {
      console.error('Error changing password:', error)
      addToast({
        title: 'Password change failed',
        description: error.message || 'Failed to change password',
        type: 'error',
        duration: 4000,
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Not set'}</span>

            <span className="text-muted-foreground">Username</span>
            <span>{user?.userName || 'Not available'}</span>

            <span className="text-muted-foreground">Email</span>
            <span>{user?.emailAddress || 'Not set'}</span>

            <span className="text-muted-foreground">Website</span>
            <span>{user?.website || 'Not set'}</span>

            <span className="text-muted-foreground">Description</span>
            <span>{user?.description || 'Not set'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings Card */}
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

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email</Label>
              <Input
                id="emailAddress"
                type="email"
                value={editForm.emailAddress}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, emailAddress: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={editForm.website}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image Host</Label>
              <Input
                id="image"
                value={editForm.image}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, image: e.target.value }))
                }
                placeholder="e.g. http://i.imgur.com/09oVvZg.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => {
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                  setPasswordError('')
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => {
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  setPasswordError('')
                }}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? 'Changing...' : 'Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}