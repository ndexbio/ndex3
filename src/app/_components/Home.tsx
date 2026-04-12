'use client'
import { FeaturedContentCarousel } from './FeaturedContentCarousel'
import { BlogContent } from './BlogContent'
import { LogoCarousel } from './LogoCarousel'
export default function Home() {
  return (
    <main className="container mx-auto px-1 py-1 mb-1 flex flex-col gap-2 h-full overflow-y-auto">
      <FeaturedContentCarousel />
      <BlogContent />
      <LogoCarousel />
    </main>
  )
}