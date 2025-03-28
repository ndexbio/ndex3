'use client'

import { Suspense } from 'react'
import { useFeaturedContent } from '@/hooks/use-content-service'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
// import { Skeleton } from '@/components/ui/skeleton'
import { FeaturedContentItem } from '@/types/api/ui/content'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { ExternalLinkIcon } from 'lucide-react'

// Separate the content rendering from loading state management
function FeaturedContentDisplay() {
  // This hook now should throw promises for Suspense to catch
  const { data } = useFeaturedContent()

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Featured Content</CardTitle>
      </CardHeader>
      <CardContent>
        <Carousel showDots={true} automaticIterate intervalSecond={5}>
          <CarouselContent>
            {data.items.map((item: FeaturedContentItem, index: number) => (
              <CarouselItem key={index}>
                <div className="flex items-center align-middle py-1 px-4">
                  <div className="overflow-hidden h-[120px]">
                    <Image
                      src={item.imageURL}
                      alt={item.title}
                      width={180} // Set a fixed width for the image
                      height={180} // Set a fixed height for the image
                      className="h-full w-auto px-10 max-w-none object-cover"
                    />
                  </div>

                  <div className="w-2xl">
                    <h3
                      className="font-medium tracking-tight"
                      dangerouslySetInnerHTML={{ __html: item.title }}
                    />
                    <p className="py-2">{item.text}</p>
                  </div>
                  <div className="px-8">
                    <a
                      href={item.URL ?? ''}
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLinkIcon
                        className="items-center align-middle text-gray-500 hover:text-gray-800"
                        size={32}
                        aria-label="External link"
                      />
                    </a>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </CardContent>
    </Card>
  )
}

// Loading fallback component
function LoadingSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Loading Featured Content...</CardTitle>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  )
}

// Main component with Suspense and ErrorBoundary
export function FeaturedContentCarousel() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FeaturedContentDisplay />
    </Suspense>
  )
}
