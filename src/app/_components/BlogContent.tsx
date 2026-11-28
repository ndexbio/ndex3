'use client'

import { useBlogContent } from '@/hooks/use-content-service'
import { Skeleton } from '@/components/ui/skeleton'
import './blog-content.css'
import { Card, CardContent } from '@/components/ui/card'

export function BlogContent() {
  const { data, isLoading, error } = useBlogContent()

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-[500px]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-[250px]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-[500px]">
        <div className="text-red-500">
          <p>Error loading content. Please try again later.</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-[500px]">
        <div className="text-gray-500">
          <p>No content available at this time.</p>
        </div>
      </div>
    )
  }

  // Render content side by side
  return (
    <Card className="w-full container px-0 py-0">
      <CardContent className="py-0 flex gap-6">
        {data.map((html, idx: number) => (
          <div
            key={idx}
            className="flex-1 overflow-auto blog-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </CardContent>
    </Card>
  )
}
