'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="w-full py-4 bg-gray-100 flex-grow-1">
      <div className="mx-auto max-w-7xl px-4 md:flex md:justify-between md:items-start text-sm">
        {/* Left Column: LEGAL */}
        <div className="mb-6 md:mb-0">
          <h4 className="scroll-m-20 text-lg font-semibold tracking-tight">
            Legal
          </h4>
          <p className="leading-7 [&:not(:first-child)]:mt-6">
            NDEx{' '}
            <Link
              href="https://home.ndexbio.org/disclaimer-license/"
              className="text-blue-600 hover:underline"
            >
              License, Terms &amp; Privacy Policy
            </Link>
          </p>
          <p className="mt-2 text-gray-600">
            Copyright © 2013–
            {new Date().getFullYear()}, The Regents of the University of
            California, The Cytoscape Consortium. All rights reserved.
          </p>
        </div>

        {/* Right Column: FOLLOW US */}
        <div>
          <h3 className="scroll-m-20 text-lg font-semibold tracking-tight">
            Follow Us
          </h3>
          <div className="container py-2 flex items-center">
            {/* YouTube Link */}
            <Link
              href="https://www.youtube.com/@ndexproject"
              aria-label="YouTube"
            >
              <Image
                src="/youtube_mono.svg"
                alt="YouTube"
                width={32}
                height={32}
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
