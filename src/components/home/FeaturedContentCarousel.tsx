'use client'

import { useFeaturedContent } from '@/hooks/use-content-service'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Skeleton } from '@/components/ui/skeleton'
import { FeaturedContentItem } from '@/types/api/ui/content'

export function FeaturedContentCarousel() {
  const { data, isLoading, error } = useFeaturedContent()

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-lg font-semibold">Featured Content</h2>
        </div>
        <Carousel className="w-full">
          <CarouselContent>
            {[1, 2, 3].map((_, index) => (
              <CarouselItem key={index}>
                <div className="flex items-start space-x-4 py-4 px-8">
                  <div className="w-1/3">
                    <Skeleton className="w-[120px] h-[120px] rounded-md" />
                  </div>
                  <div className="w-2/3 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[250px]" />
                    <Skeleton className="h-3 w-[180px]" />
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-lg font-semibold">Featured Content</h2>
        </div>
        <div className="flex items-center justify-center p-8 text-red-500">
          <p>Error loading featured content. Please try again later.</p>
        </div>
      </div>
    )
  }

  // No data case
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-lg font-semibold">Featured Content</h2>
        </div>
        <div className="flex items-center justify-center p-8 text-gray-500">
          <p>No featured content available at this time.</p>
        </div>
      </div>
    )
  }

  // Render content
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center mb-1">
        <h2 className="text-lg font-semibold">Featured Content</h2>
      </div>
      <Carousel className="w-full" showDots={true}>
        <CarouselContent>
          {data.items.map((item: FeaturedContentItem, index: number) => (
            <CarouselItem key={index}>
              <div className="flex items-start space-x-4 py-4 px-8">
                <div className="flex-shrink-0 overflow-hidden h-[120px] flex items-center justify-center">
                  <img
                    src={item.imageURL}
                    alt={item.title}
                    className="h-full w-auto max-w-none object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <a
                    href={item.URL ?? ''}
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    <div dangerouslySetInnerHTML={{ __html: item.title }} />
                    <div>{item.text}</div>
                  </a>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  )
}
