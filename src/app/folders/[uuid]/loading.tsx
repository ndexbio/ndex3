import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading UI for Dynamic Folder Pages
 * 
 * Displays while folder content is being fetched.
 * Shows skeleton UI matching the expected folder content layout.
 */
export default function FolderLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-12" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
