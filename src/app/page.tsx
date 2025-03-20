'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Info } from 'lucide-react'
import { FeaturedNetworksButton } from '@/components/home/FeaturedNetworksButton'
import { SearchExamplesButton } from '@/components/home/SearchExamplesButton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FeaturedContentCarousel } from '@/components/home/FeaturedContentCarousel'
import { BlogContent } from '@/components/home/BlogContent'

export default function Home() {
  return (
    <main className="container mx-auto px-2 py-4">
      {/* Search Section and 'Featured Content' Section*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Search Section */}
        <section className="min-w-[25rem] bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="flex flex-row space-y-3 w-full max-w-3xl gap-6">
            {/* Buttons */}
            <div className="w-[12rem] flex flex-col gap-3">
              <Button className="w-full bg-ndex hover:bg-ndex-hover text-white rounded-3xl">
                Latest Networks
              </Button>
              <div className="w-full">
                <FeaturedNetworksButton />
              </div>
              <div className="w-full">
                <SearchExamplesButton />
              </div>
            </div>

            {/* Search Box */}
            <div className="flex-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for networks, users, and groups"
                  className="w-full pr-10 border-gray-300"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Term Expansion Checkbox */}
              <div className="flex items-center mt-4">
                <input type="checkbox" id="termExpansion" className="mr-2" />
                <label htmlFor="termExpansion" className="text-sm">
                  Perform Search Term Expansion (Genes and Proteins only)
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help">
                      <Info className="h-4 w-4 text-blue-600 ml-1" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md bg-black text-white p-3 text-sm">
                    <p>
                      This option expands the search term(s) to include all
                      known aliases for a "human" gene(s)/protein(s). For
                      example, searching for AKT1 will retrieve all networks
                      where the term AKT1 is mentioned either in the network
                      name, description or in any of the node names. When the
                      Search Term Expansion option is enabled, search results
                      will also include networks where a node's name is
                      "PKB-ALPHA", "P31749", "HGNC:391", etc.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Content Section */}
        <section className="min-w-[25rem] bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <FeaturedContentCarousel />
        </section>
      </div>
      <div className="mt-8">
        <BlogContent />
      </div>
    </main>
  )
}
