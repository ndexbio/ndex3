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
        <Button className="w-full bg-ndex hover:bg-[#2c70ac] text-white rounded-3xl">
          Search Examples <ChevronDown className="" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="" align="start" sideOffset={4}>
        <DropdownMenuItem>
          Mentioning any term in a list: &quot;TP53 MDM2 RB1 CDK4&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>
          With &quot;AND&quot; for co-occurrence : &quot;TP53 AND BARD1&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>
          By wildcard and property: &quot;name:mel*&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>
          By numeric property range: &quot;nodeCount:[11 TO 79]&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>
          By UUID: &quot;uuid:c53894ce-8e47-11e5-b435-06603eb7f303&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>
          Created between 1.1.16 and 4.27.16 :
          &quot;creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]&quot;
        </DropdownMenuItem>
        <DropdownMenuItem>Documentation on Searching in NDEx</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
