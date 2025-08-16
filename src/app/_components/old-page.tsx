'use client'

import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import { FeaturedNetworksButton } from '@/app/search/_components/FeaturedNetworksButton'
import { SearchExamplesButton } from './SearchExamplesButton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FeaturedContentCarousel } from './FeaturedContentCarousel'
import { BlogContent } from './BlogContent'
import { LogoCarousel } from './LogoCarousel'
import { SearchBox } from '@/components/SearchBox'

export default function OldHome() {
  return (
    <main className="container mx-auto px-2 py-3 mb-4">
      {/* Search Section and 'Featured Content' Section*/}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Search Section */}
        <section className="min-w-[25rem] bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center">
          <div className="flex flex-row items-center w-full max-w-full">
            {/* Buttons */}
            <div className="flex items-start w-full max-w-full">
              <div className="w-[12rem] flex flex-col gap-3 mr-6">
                <Button className="w-full bg-ndex hover:bg-[#2c70ac] text-white rounded-3xl">
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
              <div className="flex-1 ">
                <div className="relative">
                  <SearchBox />
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
                    <TooltipContent className="max-w-md bg-gray-600 text-white p-3 text-sm">
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
          </div>
        </section>

        {/* Featured Content Section */}
        <section className="min-w-[25rem] bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <FeaturedContentCarousel />
        </section>
      </div>
      <div className="mt-6">
        <BlogContent />
      </div>
      <div className="mt-6">
        <LogoCarousel />
      </div>
    </main>
  )
}
