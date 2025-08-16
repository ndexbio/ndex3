'use client'
import { NetworkSummary } from '@/types/api/ndex'
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useSearchStore } from '@/stores/search-store'

type SortField = 'nodeCount' | 'edgeCount'
type SortDirection = 'asc' | 'desc'

interface NetworkTableProps {
  networks: NetworkSummary[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  totalCount: number
}

export function NetworkTable({
  networks,
  isLoading,
  hasMore,
  onLoadMore,
  totalCount,
}: NetworkTableProps) {
  const [sortField, setSortField] = useState<SortField>('nodeCount')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [hasUserSorted, setHasUserSorted] = useState(false)
  const prevNetworksLength = useRef(networks.length)
  const observerTarget = useRef<HTMLDivElement>(null)
  const queryString: string = useSearchStore((state) => state.query)

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore) {
          // Call onLoadMore even if isLoading, the loadMore function will handle the check
          onLoadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // Increased to trigger loading earlier
      },
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, onLoadMore]) // Removed isLoading dependency to prevent recreation

  // Update reference for network length changes
  useEffect(() => {
    prevNetworksLength.current = networks.length
  }, [networks.length])

  useEffect(() => {
    console.log('%%%%%%%%%%% Table Data: UPDATED', networks)
  }, [networks])

  const handleSort = (field: SortField) => {
    setHasUserSorted(true)
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedNetworks = hasUserSorted
    ? [...networks].sort((a, b) => {
        const modifier = sortDirection === 'asc' ? 1 : -1
        return (a[sortField] - b[sortField]) * modifier
      })
    : networks

  if (!networks || networks.length === 0) {
    const message =
      queryString === '' ? 'Please enter a search query' : 'No results'
    return (
      <div className="flex items-center justify-center w-full h-40">
        <h4 className="text-lg font-medium text-muted-foreground">{message}</h4>
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-2">Index</TableHead>
            <TableHead className="w-1/9">Name</TableHead>
            <TableHead className="w-1/6 hidden sm:table-cell">
              Description
            </TableHead>
            <TableHead>Created</TableHead>
            <TableHead
              className={cn(
                'cursor-pointer select-none',
                sortField === 'nodeCount' && 'text-primary',
              )}
              onClick={() => handleSort('nodeCount')}
            >
              Nodes{' '}
              {sortField === 'nodeCount' &&
                (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className={cn(
                'cursor-pointer select-none',
                sortField === 'edgeCount' && 'text-primary',
              )}
              onClick={() => handleSort('edgeCount')}
            >
              Edges{' '}
              {sortField === 'edgeCount' &&
                (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedNetworks.map((network: NetworkSummary, index: number) => (
            <TableRow key={network.externalId}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{network.name}</TableCell>
              <TableCell>
                {network.description && network.description.length > 100
                  ? network.description.slice(0, 100) + '...'
                  : network.description}
              </TableCell>
              <TableCell>
                {new Date(network.creationTime).toLocaleDateString()}
              </TableCell>
              <TableCell>{network.nodeCount}</TableCell>
              <TableCell>{network.edgeCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 pb-4">
        <div
          ref={observerTarget}
          className="h-16 flex items-center justify-center"
        >
          {isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Loading more networks...
            </div>
          )}
          {!isLoading && hasMore && networks.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Loaded {networks.length} of {totalCount} networks
            </div>
          )}
          {!hasMore && networks.length > 0 && (
            <div className="text-sm text-muted-foreground">
              All {totalCount} networks loaded
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
