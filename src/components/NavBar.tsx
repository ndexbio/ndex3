'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { SearchBox } from '@/components/search/SearchBox'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { User, Loader2 } from 'lucide-react'
import { UserAvatar } from './user/UserAvatar'

export function NavBar() {
  const { isAuthenticated, login } = useAuth()

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
            <Image
              src="/ndex-logo.svg"
              alt="NDEx Logo"
              width={80}
              height={24}
            />
            NDEx
          </Link>
          <div className="flex-1 px-4">
            <SearchBox />
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-4 ml-6">
            <Link
              href="https://home.ndexbio.org/about-ndex/"
              className="text-m font-medium px-2.5 py-1.5 rounded hover:bg-gray-100"
            >
              About
            </Link>
            <Link
              href="https://home.ndexbio.org/quick-start/"
              className="text-m font-medium px-2.5 py-1.5  rounded hover:bg-gray-100"
            >
              Docs
            </Link>
            <Link
              href="https://home.ndexbio.org/report-a-bug/"
              className="text-m font-medium px-2.5 py-1.5  rounded hover:bg-gray-100"
            >
              Report Bug
            </Link>
            <Link
              href="https://home.ndexbio.org/contact-us/"
              className="text-m font-medium px-2.5 py-1.5 rounded hover:bg-gray-100"
            >
              Contact Us
            </Link>
            <Link
              href="https://home.ndexbio.org/about-ndex/#cite_NDEx"
              className="text-m font-medium px-2.5 py-1.5  rounded hover:bg-gray-100"
            >
              Cite Us
            </Link>
            <Link
              href="https://home.ndexbio.org/faq/"
              className="text-m font-medium px-2.5 py-1.5  rounded hover:bg-gray-100"
            >
              FAQ
            </Link>
          </nav>
        </div>
        {isAuthenticated ? (
          <UserAvatar />
        ) : (
          <Button
            size="sm"
            className="bg-ndex hover:bg-[#2c70ac] mr-3"
            onClick={login}
          >
            <User className="h-4 w-4 mr-2" />
            Login
          </Button>
        )}
      </div>
    </header>
  )
}
