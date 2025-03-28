import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'
import { useConfig } from '@/lib/contexts/ConfigContext'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import Image from 'next/image'

export function LogoCarousel() {
  const config = useConfig()
  const logos = config.uiContent.logo

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
        {logos.map((logo, index) => (
          <SwiperSlide key={index} className="flex items-center justify-center">
            <Image
              src={logo.src.trim()} // trim to remove any leading/trailing whitespace
              alt={logo.alt}
              width={100}
              height={150} // Adjust height as needed
              className="h-14 w-14 items-center w-auto object-contain"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
