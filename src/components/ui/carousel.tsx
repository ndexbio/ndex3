import * as React from 'react'
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// -- Types ----------------------------------------------------------

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  setApi?: (api: CarouselApi) => void
  showDots?: boolean
  automaticIterate?: boolean
  intervalSecond?: number
}

// -- Context Setup ---------------------------------------------------

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />')
  }
  return context
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

// -- Main Carousel ---------------------------------------------------

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  showDots = false,
  automaticIterate = false,
  intervalSecond = 3,
  children,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  // Initialize Embla
  const [carouselRef, api] = useEmblaCarousel(
    { loop: true, ...opts, axis: orientation === 'horizontal' ? 'x' : 'y' },
    plugins,
  )

  // State for Prev/Next availability
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  // State for selected slide index and total slides (for dots)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [totalSlides, setTotalSlides] = React.useState(0)

  const [isHovered, setIsHovered] = React.useState(false)

  const onSelect = React.useCallback((emblaApi: CarouselApi) => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  // Optional arrow-key handling
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext],
  )

  // Pass API outward if needed
  React.useEffect(() => {
    if (api && setApi) {
      setApi(api)
    }
  }, [api, setApi])

  // Listen to Embla events
  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    setTotalSlides(api.slideNodes().length)

    api.on('reInit', onSelect)
    api.on('select', onSelect)

    return () => {
      api.off('select', onSelect)
      api.off('reInit', onSelect)
    }
  }, [api, onSelect])

  /* Auto-iteration */
  React.useEffect(() => {
    if (!api || !automaticIterate || isHovered) return

    const intervalId = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext()
      } else {
        // Optionally jump back to the first slide
        api.scrollTo(0)
      }
    }, intervalSecond * 1000)

    // Clear interval on unmount or when dependencies change
    return () => clearInterval(intervalId)
  }, [api, automaticIterate, intervalSecond, isHovered])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        showDots,
        orientation,
        opts,
        plugins,
        automaticIterate,
        intervalSecond,
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}

        {/* Optional Dots */}
        {showDots && totalSlides > 0 && (
          <div className="flex justify-center space-x-2 my-1">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'h-3 w-3 rounded-full transition-colors',
                  index === selectedIndex ? 'bg-blue-500' : 'bg-gray-300',
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </CarouselContext.Provider>
  )
}

// -- Carousel Subcomponents ------------------------------------------

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-12 pr-4' : 'pt-6',
        className,
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        'absolute size-8 rounded-full',
        orientation === 'horizontal'
          ? 'top-1/2 -left-12 -translate-y-1/2'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        'absolute size-8 rounded-full',
        orientation === 'horizontal'
          ? 'top-1/2 -right-12 -translate-y-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

// -- Exports ---------------------------------------------------------

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
