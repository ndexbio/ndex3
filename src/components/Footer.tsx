'use client'

import React from 'react'
import Link from 'next/link'
import { FaYoutube } from 'react-icons/fa'

export function Footer() {
  return (
    <footer className="w-full bg-gray-100 py-6">
      {/* Container */}
      <div className="mx-auto max-w-6xl px-4 md:flex md:justify-between md:items-start text-sm">
        {/* Left Column: LEGAL */}
        <div className="mb-6 md:mb-0">
          <h3 className="font-bold uppercase text-gray-700 mb-2">LEGAL</h3>
          <p>
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
          <h3 className="font-bold uppercase text-gray-700 mb-2">Follow Us</h3>
          <div className="flex items-center space-x-4">
            {/* YouTube Link */}
            <Link
              href="https://www.youtube.com/@ndexproject"
              aria-label="YouTube"
            >
              <div className="p-2 bg-white rounded-full shadow hover:shadow-md">
                <FaYoutube className="text-red-500 w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
