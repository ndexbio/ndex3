'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchIcon } from 'lucide-react'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSearchStore } from '@/stores/search-store'

export function SearchBox() {
  const { addToHistory } = useSearchStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentQuery, setCurrentQuery] = useState<string>('')

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    setCurrentQuery(urlQuery ? decodeURIComponent(urlQuery) : '')
  }, [searchParams])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.currentTarget.value.trim()) {
      e.preventDefault()
      if (searchParams.get('q')) router.push('/search')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextQuery = currentQuery.trim()
    if (!nextQuery) return
    addToHistory(nextQuery)
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="relative border-1 border-slate-500 rounded-sm overflow-hidden">
        <Input
          type="search"
          placeholder="Search for networks..."
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-80 md:w-96 lg:w-[20rem]"
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
    </form>
  )
}
