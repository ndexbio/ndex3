import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import UserProfile from '@/components/user/UserProfile'

/**
 * Generate static params for static export
 * Returns empty array as this route is dynamic and should be generated at runtime
 */
export function generateStaticParams() {
  return []
}

export default function UserPage({ params }: { params: { uuid: string } }) {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <UserProfile uuid={params.uuid} />
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
