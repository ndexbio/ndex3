import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { useLogos } from '@/hooks/use-content-service'
import { Logo } from '@/types/entities/AppConfig'
import { Skeleton } from '@/components/ui/skeleton'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Image from 'next/image'

/**
 * LogoCarousel Component
 * 
 * Displays a carousel of partner/organization logos that are loaded from a remote configuration file.
 * The logos are configured via the uiContent.logos property in the app configuration.
 * 
 * Configuration Structure:
 * - Logo data is fetched from: {contentRootPath}/{logos filename}
 * - Each logo object contains:
 *   - image: Path to logo image file (relative to contentRootPath)
 *   - title: Tooltip text displayed on hover
 *   - href: URL to navigate to when logo is clicked
 * 
 * Example logo configuration file structure:
 * {
 *   "logos": [
 *     {
 *       "image": "logos/ucsd_logo_alt.png",
 *       "title": "University of California, San Diego", 
 *       "href": "http://ucsd.edu/"
 *     }
 *   ]
 * }
 * 
 * The component handles three states:
 * 1. Loading: Shows skeleton placeholders
 * 2. Error: Shows error message with configuration details
 * 3. Success: Renders the logo carousel with clickable logos
 */
export function LogoCarousel() {
  const config = useConfig()
  const { data: logos, isLoading, error } = useLogos()

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full p-2">
        <div className="flex gap-4 justify-center">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-14 rounded" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full p-2">
        <div className="text-center text-red-500">
          <p>Error loading logo carousel data.</p>
          <p className="text-sm mt-1">Configuration: {config.uiContent.contentRootPath}/{config.uiContent.logos}</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // No data state
  if (!logos || logos.length === 0) {
    return (
      <div className="w-full p-2">
        <div className="text-center text-gray-500">
          <p>No logos available to display.</p>
          <p className="text-sm">Configuration: {config.uiContent.contentRootPath}/{config.uiContent.logos}</p>
        </div>
      </div>
    )
  }

  // Success state - render carousel
  return (
    <div className="w-full p-2">
      <Swiper
        modules={[Autoplay, Navigation]}
        slidesPerView={6} // how many logos visible at once
        spaceBetween={20} // space in pixels between slides
        loop={true} // loop back to the start
        autoplay={{
          delay: 4000, // delay between auto slides (ms)
          disableOnInteraction: false,
        }}
        navigation={false} // show "next" and "prev" arrows
        pagination={{ clickable: true }}
        grabCursor={true} // display a grab cursor on hover (for mouse drag)
        className="logoSwiper" // optional custom class
      >
        {logos.map((logo: Logo, index: number) => (
          <SwiperSlide key={index} className="flex items-center justify-center !overflow-visible">
            <a
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              title={logo.title}
              className="flex items-center justify-start h-14"
            >
              <img
                src={`${config.uiContent.contentRootPath}/${logo.image}`.trim()}
                alt={logo.title}
                className="h-14 w-auto max-w-none object-contain hover:opacity-80 transition-opacity"
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
