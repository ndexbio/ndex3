import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import UserProfile from '../_components/UserProfile'

/**
 * Generate static params for static export
 * For dynamic user routes, we return a placeholder to satisfy Next.js static export requirements
 * All actual user UUIDs are handled by client-side routing
 */
export async function generateStaticParams() {
  // For static export, we need to provide at least one static param
  // Since user UUIDs are dynamic and unknown at build time,
  // we provide a placeholder that will be handled at runtime
  return [
    { uuid: 'placeholder' }
  ]
}

interface UserPageProps {
  params: Promise<{
    uuid: string
  }>
}

export default async function UserPage({ params }: UserPageProps) {
  const { uuid } = await params;
  
  // Ensure we have a valid UUID (not the placeholder)
  const actualUuid = uuid === 'placeholder' ? undefined : uuid;

  if (!actualUuid) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <UserProfile uuid={actualUuid} />
      </Suspense>
    </div>
  )
}

function LoadingSkeleton() {
  return (
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
  )
}
