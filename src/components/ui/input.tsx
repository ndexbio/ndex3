import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-0 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 appearance-none border-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
