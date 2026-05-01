'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Quick Start', href: '/docs' },
  { label: 'Create an Account', href: '/docs/create-an-ndex-account' },
  { label: 'Finding & Querying', href: '/docs/finding-and-querying' },
  { label: 'Sharing & Accessing', href: '/docs/sharing-and-accessing' },
  { label: 'Publishing', href: '/docs/publishing' },
  { label: 'Data Model', href: '/docs/data-model' },
  { label: 'Using the API', href: '/docs/using-the-ndex-api' },
  { label: 'Best Practices', href: '/docs/developers-best-practices' },
]

export default function DocsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-6">
      <div>
        <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentation
        </h3>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive =
              item.href === '/docs'
                ? pathname === '/docs'
                : pathname?.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}