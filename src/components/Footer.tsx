'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { withBasePath } from '../lib/utils/path-utils'
import { useBasePath } from '../lib/contexts/ConfigContext'

export function Footer() {
  const basePath = useBasePath()
  return (
    <footer className="w-full py-4 bg-muted flex-grow-1">
      <div className="mx-auto max-w-7xl px-4 md:flex md:justify-between md:items-start text-sm">
        {/* Left Column: LEGAL */}
        <div className="mb-6 md:mb-0">
          <h4 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground">
            Legal
          </h4>
          <p className="leading-7 [&:not(:first-child)]:mt-6 text-foreground">
            NDEx{' '}
            <Link
              href="https://home.ndexbio.org/disclaimer-license/"
              className="text-primary hover:underline"
            >
              License, Terms &amp; Privacy Policy
            </Link>
          </p>
          <p className="mt-2 text-muted-foreground">
            Copyright © 2013–
            {new Date().getFullYear()}, The Regents of the University of
            California, The Cytoscape Consortium. All rights reserved.
          </p>
        </div>

        {/* Right Column: FOLLOW US */}
        <div>
          <h3 className="scroll-m-20 text-lg font-semibold tracking-tight text-foreground">
            Follow Us
          </h3>
          <div className="container py-2 flex items-center">
            {/* YouTube Link */}
            <Link
              href="https://www.youtube.com/@ndexproject"
              aria-label="YouTube"
              className="hover:opacity-80 transition-opacity"
            >
              <div className="relative w-8 h-8">
                <Image
                  src={withBasePath("/youtube_mono.svg", basePath)}
                  alt="YouTube"
                  fill
                  sizes="32px"
                  className="object-contain filter dark:invert"
                />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
