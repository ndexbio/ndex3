'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Loader2, ExternalLink } from 'lucide-react'
import { useFeaturedNetworks } from '@/hooks/use-content-service'
import { FeaturedNetwork } from '@/types/api/ui/content'

export function FeaturedNetworksButton() {
  const { data, isLoading, error } = useFeaturedNetworks()

  const handleNetworkClick = (network: FeaturedNetwork) => {
    // Open the network in a new tab
    if (network.UUID) {
      window.open(
        `https://www.ndexbio.org/viewer/networks/${network.UUID}`,
        '_blank',
      )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full bg-ndex hover:bg-[#2c70ac] text-white rounded-3xl">
          Featured Networks{' '}
          {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          {!isLoading && <ChevronDown className="ml-2" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[60vh] overflow-y-auto"
        align="start"
        sideOffset={4}
      >
        {isLoading && (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading networks...
          </DropdownMenuItem>
        )}

        {error && (
          <DropdownMenuItem disabled className="text-red-500">
            Error loading networks
          </DropdownMenuItem>
        )}

        {data && data.items.length > 0 ? (
          <>
            {data.items.map((network: FeaturedNetwork, index: number) => (
              <DropdownMenuItem
                key={network.UUID || index}
                onClick={() => handleNetworkClick(network)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{network.title}</span>
                <ExternalLink className="h-3 w-3 ml-2 opacity-50" />
              </DropdownMenuItem>
            ))}
          </>
        ) : !isLoading && !error ? (
          <DropdownMenuItem disabled>
            No featured networks available
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
