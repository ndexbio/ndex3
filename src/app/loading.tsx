import { Skeleton } from "@/components/ui/skeleton"

/**
 * Global Loading UI
 * 
 * Fallback loading component for the entire app.
 * Displays a generic loading state when no specific loading.tsx is found.
 */
export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar Skeleton */}
      <div className="border-b bg-background">
        <div className="w-full h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-9 w-80" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-12 w-96 mb-4" />
            <Skeleton className="h-6 w-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-20 w-full mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
