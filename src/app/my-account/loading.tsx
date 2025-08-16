import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading UI for My Account Page
 * 
 * Displays while user's personal account data is being fetched.
 * Shows skeleton UI matching the expected account layout.
 */
export default function MyAccountLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/20 p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-6 w-6" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-9" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
