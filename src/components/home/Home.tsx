'use client'

import { FeaturedContentCarousel } from '@/components/home/FeaturedContentCarousel'
import { BlogContent } from '@/components/home/BlogContent'
import { LogoCarousel } from '@/components/home/LogoCarousel'

export default function Home() {
  return (
    <main className="container mx-auto px-2 py-3 mb-4">
      <FeaturedContentCarousel />
      <div className="mt-6">
        <BlogContent />
      </div>
      <div className="mt-6">
        <LogoCarousel />
      </div>
    </main>
  )
}
