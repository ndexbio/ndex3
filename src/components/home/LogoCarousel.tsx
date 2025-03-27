import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'
import { useConfig } from '@/lib/contexts/ConfigContext'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export function LogoCarousel() {
  const config = useConfig()
  const logos = config.uiContent.logo

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
        {logos.map((logo, index) => (
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
