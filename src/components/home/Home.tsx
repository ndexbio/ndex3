'use client'

import { FeaturedContentCarousel } from '@/components/home/FeaturedContentCarousel'
import { BlogContent } from '@/components/home/BlogContent'
import { LogoCarousel } from '@/components/home/LogoCarousel'

export default function Home() {
  return (
    <main className="container mx-auto px-1 py-1 mb-1 flex flex-col gap-2">
      <FeaturedContentCarousel />
      <BlogContent />
      <LogoCarousel />
    </main>
  )
}
