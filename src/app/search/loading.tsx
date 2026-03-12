import { Skeleton } from "@/components/ui/skeleton"

export default function SearchLoading() {
  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Tab bar */}
      <div className="flex space-x-1 mb-4 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>

      {/* Folders section */}
      <div className="mb-4">
        <Skeleton className="h-5 w-16 mb-2" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      {/* Networks section */}
      <div>
        <Skeleton className="h-5 w-24 mb-2" />
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
