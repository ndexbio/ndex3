'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSearchStore } from '@/stores/search-store'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchBox() {
  const { setQuery } = useSearchStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentQuery, setCurrentQuery] = useState<string>('')

  const inputRef = useRef<HTMLInputElement>(null)

  // If there's a query in the URL, sync it with our state on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (urlQuery) {
      setCurrentQuery(decodeURIComponent(urlQuery))
    }
  }, [searchParams])

  // Handle Enter key or submit button
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextQuery = currentQuery.trim()
    if (!nextQuery) {
      console.log('Empty search prevented')
      return
    }
    setQuery(nextQuery)
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  // Prevent blank "Enter"
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !currentQuery.trim()) {
      e.preventDefault()
      console.log('Empty search prevented (Enter key)')
    }
  }

  // Clear search if the input is cleared via the built-in browser 'x' in type=search
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const handleSearch = () => {
      if (input.value === '') {
        console.log('Search cleared via x button')
        setCurrentQuery('')
        setQuery('')
        router.push('/search')
      }
    }
    input.addEventListener('search', handleSearch)
    return () => input.removeEventListener('search', handleSearch)
  }, [setQuery, router])

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-7xl">
      {/* Rounded container for the search input + icon */}
      <div className="flex items-center rounded-lg border border-gray-300 pl-1 pr-3 py-0.5">
        {/* The text input */}
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search for networks, users, and groups"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="
            flex-1
            border-none
            bg-transparent
            placeholder-gray-500
            outline-none 
            focus:outline-none 
            focus:ring-0 
            focus:border-transparent
          "
        />
        {/* Vertical divider */}
        <div className="mx-2 h-5 w-px bg-gray-300" />
        {/* Search icon */}
        <button
          type="submit"
          aria-label="Search"
          className="text-gray-400 hover:text-gray-600 disabled:hover:text-gray-400 disabled:opacity-50"
          disabled={!currentQuery.trim()}
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </form>
  )
}
