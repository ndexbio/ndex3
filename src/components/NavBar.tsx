'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { SearchBox } from './SearchBox'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { User, ChevronDown } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { withBasePath } from '@/lib/utils/path-utils'
import { ModeToggle } from './mode-toggle'
import { useBasePath } from '@/lib/contexts/ConfigContext'
import { usePathname } from 'next/navigation'

export function NavBar() {
  const { isAuthenticated, login } = useAuth()
  const basePath = useBasePath()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const handleLogin = () => {
    const hasBasePath = Boolean(basePath)
    const isOnHomePage = pathname === '/' ||
                        (hasBasePath && pathname === `/${basePath}/`) ||
                        (hasBasePath && pathname === `/${basePath}`)
    console.log('🏠 NavBar login check:', {
      pathname,
      basePath,
      hasBasePath,
      isOnHomePage,
      'Current URL': window.location.href
    })
    login(isOnHomePage)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
      <div className="w-full h-14 flex items-center justify-between">
        {/* Left Section: Logo + Nav Links */}
        <div className="flex items-center px-3 gap-4">
          <Link
            href="/"
            className="scroll-m-20 text-5xl font-light tracking-tight flex items-center
                       justify-start gap-2 text-ndex"
          >
            <div className="relative w-20 h-6">
              <Image
                src={withBasePath("/ndex-logo.svg", basePath)}
                alt="NDEx Logo"
                fill
                sizes="80px"
                className="object-contain"
              />
            </div>
            NDEx
          </Link>
          <div className="flex-1 px-4">
            <SearchBox />
          </div>
          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <Link
              href="/about"
              className="text-sm font-medium px-2.5 py-1.5 rounded hover:bg-muted"
            >
              About
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium px-2.5 py-1.5 rounded hover:bg-muted"
            >
              Docs
            </Link>
            <Link
              href="/faq"
              className="text-sm font-medium px-2.5 py-1.5 rounded hover:bg-muted"
            >
              FAQ
            </Link>
            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 rounded hover:bg-muted"
              >
                More
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    moreOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {moreOpen && (
                <div className="absolute top-full right-0 mt-1 w-44 rounded-md border bg-popover shadow-md z-50">
                  <div className="py-1">
                    <Link
                      href="/contact"
                      onClick={() => setMoreOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-muted rounded-sm mx-1"
                    >
                      Contact Us
                    </Link>
                    <Link
                      href="/report-bug"
                      onClick={() => setMoreOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-muted rounded-sm mx-1"
                    >
                      Report Bug
                    </Link>
                    <Link
                      href="/about#cite"
                      onClick={() => setMoreOpen(false)}
                      className="block px-3 py-2 text-sm hover:bg-muted rounded-sm mx-1"
                    >
                      Cite NDEx
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <ModeToggle />
            <UserAvatar />
          </div>
        ) : (
          <Button
            size="sm"
            className="bg-ndex hover:bg-[#2c70ac] mr-3"
            onClick={handleLogin}
          >
            <User className="h-4 w-4 mr-2" />
            Login
          </Button>
        )}
      </div>
    </header>
  )
}