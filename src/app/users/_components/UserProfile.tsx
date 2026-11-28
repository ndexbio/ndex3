'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/hooks/use-user'

interface UserProfileProps {
  /** UUID of the user */
  uuid: string
}

export default function UserProfile({ uuid }: UserProfileProps) {
  const { user, isLoading, error } = useUser(uuid)

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load user profile: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested user profile could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {user.firstName} {user.lastName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">@{user.userName}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">User Information</h3>
              <p className="text-sm">UUID: {user.externalId}</p>
              {user.website && (
                <p className="text-sm">
                  Website:{' '}
                  <a
                    href={user.website}
                    className="text-primary hover:underline"
                  >
                    {user.website}
                  </a>
                </p>
              )}
              <p className="text-sm">
                Account Type:{' '}
                {user.isIndividual ? 'Individual' : 'Organization'}
              </p>
            </div>

            {user.description && (
              <div>
                <h3 className="font-medium">Description</h3>
                <p className="text-sm">{user.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
