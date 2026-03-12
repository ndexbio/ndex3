'use client'

import { SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/KeycloakContext'

const EXAMPLE_QUERIES = ['cancer', 'SARS-CoV-2', 'PI3K pathway', 'p53', 'TP53 MDM2 RB1 CDK4']

interface SearchEmptyStateProps {
  type: 'initial' | 'no-results'
  query?: string
}

export function SearchEmptyState({ type, query }: SearchEmptyStateProps) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const handleExampleClick = (exampleQuery: string) => {
    router.push(`/search?q=${encodeURIComponent(exampleQuery)}`)
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-4">
          <SearchIcon className="h-16 w-16 text-muted-foreground/40" />
          <span className="absolute -right-1 -bottom-1 text-2xl text-muted-foreground/60">x</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">No results for &ldquo;{query}&rdquo;</h2>
        <div className="text-muted-foreground space-y-1 text-sm">
          <p>Check your spelling or try broader search terms</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <SearchIcon className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Search NDEx Networks</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Search for biological networks, pathways, and interaction datasets across NDEx.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="px-3 py-1.5 text-sm rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            {example}
          </button>
        ))}
      </div>
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground mt-6">
          Sign in to also search your private networks
        </p>
      )}
    </div>
  )
}
