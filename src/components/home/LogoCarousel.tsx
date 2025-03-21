import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const LOGOS = [
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/cyjs_logo.png',
    alt: 'Cytoscape.js',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/cytoscape_logo.png',
    alt: 'Cytoscape',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/hiview-logo.png',
    alt: 'HiView',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/janssen_logo.png',
    alt: 'Janssen',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/logo_JetBrains_3.png',
    alt: 'JetBrains',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/ndex-logo-200wide.png',
    alt: 'NDEx',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/nrnb_logo.png',
    alt: 'NRNB',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/pfizer_logo.png',
    alt: 'Pfizer',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/plos_logox90.png',
    alt: 'PLOS',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/roche_logo.png',
    alt: 'Roche',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/scientific_data.png',
    alt: 'Scientific Data',
  },
  {
    src: 'https://home.ndexbio.org/landing_page_content/v2_4_2/logos/ucsd_logo_alt.png',
    alt: 'UCSD',
  },
]

export function LogoCarousel() {
  return (
    <div className="w-full py-2 px-4">
      <Swiper
        modules={[Autoplay, Navigation]}
        slidesPerView={8} // how many logos visible at once
        spaceBetween={40} // space in pixels between slides
        loop={true} // loop back to the start
        autoplay={{
          delay: 3000, // delay between auto slides (ms)
          disableOnInteraction: false,
        }}
        navigation={false} // show "next" and "prev" arrows
        pagination={{ clickable: true }}
        grabCursor={true} // display a grab cursor on hover (for mouse drag)
        className="logoSwiper" // optional custom class
      >
        {LOGOS.map((logo, index) => (
          <SwiperSlide key={index} className="flex items-center justify-center">
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-15 w-auto object-contain"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
