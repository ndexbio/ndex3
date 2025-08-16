import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading UI for Search Page
 * 
 * Displays while search operations are being performed.
 * Shows skeleton UI matching the expected search results layout.
 */
export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Search Filters/Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      {/* Search Results Count */}
      <div className="mb-4">
        <Skeleton className="h-5 w-48" />
      </div>

      {/* Search Results Grid */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-5 w-64" />
                </div>
                <div className="space-y-2 mb-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="ml-4">
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center">
        <div className="flex space-x-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9" />
          ))}
        </div>
      </div>
    </div>
  )
}
