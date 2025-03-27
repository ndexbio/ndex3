'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchIcon } from 'lucide-react'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSearchStore } from '@/stores/search-store'
import { FeaturedNetworksButton } from '@/components/search/FeaturedNetworksButton'

export function SearchBox() {
  const { setQuery } = useSearchStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentQuery, setCurrentQuery] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery) {
      // Decode the URL query and set it to the input
      setCurrentQuery(decodeURIComponent(urlQuery))
    }
  }, [searchParams])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const nextQuery = currentQuery.trim()
    // Early return if query is empty - this prevents any submission logic
    if (!nextQuery) {
      console.log('Empty search prevented')

      return
    }

    setQuery(nextQuery)
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !currentQuery.trim()) {
      e.preventDefault()
      console.log('Empty search prevented (Enter key)')
    }
  }

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleSearch = () => {
      // This will only fire when the search is cleared via the "x" button
      if (input.value === '') {
        console.log('Search cleared via x button')
        setCurrentQuery('')
        // Optional: Also clear the store and URL
        setQuery('')
        router.push('/search')
      }
    }

    input.addEventListener('search', handleSearch)
    return () => input.removeEventListener('search', handleSearch)
  }, [setQuery, router])

  useEffect(() => {}, [currentQuery])

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="relative border-1 border-slate-500 rounded-sm overflow-hidden">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search for networks..."
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-80 md:w-96 lg:w-[20rem] [&::-webkit-search-cancel-button]:appearance-auto [&::-webkit-search-cancel-button]:h-5 [&::-webkit-search-cancel-button]:w-5 [&::-webkit-search-cancel-button]:cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="border-slate-600"
          type="submit"
          variant="outline"
          disabled={!currentQuery.trim()}
        >
          <SearchIcon />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <FeaturedNetworksButton />
      </div>
    </form>
  )
}
