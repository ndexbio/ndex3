'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export function SearchExamplesButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full bg-ndex hover:bg-ndex-hover text-white rounded-3xl">
          Search Examples <ChevronDown className="" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="" align="start" sideOffset={4}>
        <DropdownMenuItem>
          Mentioning any term in a list: "TP53 MDM2 RB1 CDK4"
        </DropdownMenuItem>
        <DropdownMenuItem>
          With "AND" for co-occurrence : "TP53 AND BARD1"
        </DropdownMenuItem>
        <DropdownMenuItem>
          By wildcard and property: "name:mel*"
        </DropdownMenuItem>
        <DropdownMenuItem>
          By numeric property range: "nodeCount:[11 TO 79]"
        </DropdownMenuItem>
        <DropdownMenuItem>
          By UUID: "uuid:c53894ce-8e47-11e5-b435-06603eb7f303"
        </DropdownMenuItem>
        <DropdownMenuItem>
          Created between 1.1.16 and 4.27.16 :
          "creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]"
        </DropdownMenuItem>
        <DropdownMenuItem>Documentation on Searching in NDEx</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
