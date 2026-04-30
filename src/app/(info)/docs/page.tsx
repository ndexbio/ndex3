'use client'

import Link from 'next/link'
import DocsFooter from './components/DocsFooter'

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Quick Start Guide
        </h1>
        <p className="text-muted-foreground">
          A step-by-step introduction to using NDEx
        </p>
        <p className="text-xs text-muted-foreground italic">
          Last updated: December 13, 2018
        </p>
      </header>

      {/* Intro */}
      <section className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Welcome to NDEx! This guide walks you through how to search, explore,
          and analyze biological networks.
        </p>
        <p className="text-muted-foreground">
          Need help or want to suggest improvements?{' '}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
      </section>

      {/* Search */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          1. Search for Networks, Users, and Groups
        </h2>

        <p className="text-muted-foreground">
          Public networks can be explored without signing in via the{' '}
          <a
            href="https://www.ndexbio.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            NDEx Public Server
          </a>
          .
        </p>

        <StepList
          steps={[
            <>
              Enter <strong>cell cycle</strong> in the search bar and press enter
            </>,
            <>Browse results across networks, users, and groups</>,
            <>Hover a network name to preview its description</>,
            <>Use <strong>Browse</strong> to explore all content</>,
            <>
              Try <strong>Search Examples</strong> for advanced queries
            </>,
          ]}
        />

        <ImagePlaceholder label="Search results page" />
      </section>

      {/* View */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          2. View a Network
        </h2>

        <StepList
          steps={[
            <>Click any public network to open it</>,
            <>Review metadata in the right-side panel</>,
            <>Scroll to explore references and properties</>,
            <>
              Toggle <strong>Table</strong> view to switch layouts
            </>,
          ]}
        />

        <ImagePlaceholder label="Network viewer interface" />
      </section>

      {/* Query */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          3. Run a Query
        </h2>

        <StepList
          steps={[
            <>Use the query input box</>,
            <>Enter a term like <strong>akt</strong></>,
            <>
              Select <strong>1-step neighborhood</strong>
            </>,
            <>
              Click <strong>Run Query</strong>
            </>,
          ]}
        />

        <div className="p-5 rounded-xl border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            This will return a subnetwork showing related nodes and edges.
          </p>
        </div>

        <ImagePlaceholder label="Query input panel" />
        <ImagePlaceholder label="Query results network" />
      </section>

      {/* Resources */}
      <DocsFooter />
    </div>
  )
}

/* --- Components --- */

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="text-xs font-medium text-primary mt-1">
            {i + 1}.
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {step}
          </p>
        </div>
      ))}
    </div>
  )
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground italic">
        📷 {label} (screenshot placeholder)
      </p>
    </div>
  )
}

function DocLink({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div className="rounded-xl border p-5 bg-card">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith('http') ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-primary hover:underline"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}