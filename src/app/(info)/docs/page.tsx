'use client'

import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Documentation
        </h1>
        <p className="text-muted-foreground">
          Learn how to search, explore, and work with networks in NDEx
        </p>
        <p className="text-xs text-muted-foreground italic">
          Last updated: December 13, 2018
        </p>
      </header>

      {/* Quick Start */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Start</h2>
        <p className="text-muted-foreground leading-relaxed">
          Welcome to NDEx! This guide will help you quickly get familiar with
          searching, viewing, and querying biological networks.
        </p>
        <p className="text-muted-foreground">
          Found an issue?{' '}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>{' '}
          — we’d love your feedback.
        </p>
      </section>

      {/* Search */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Searching Networks, Users, and Groups
        </h2>

        <p className="text-muted-foreground leading-relaxed">
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

        <div className="space-y-3">
          <Step>
            Enter a term like <strong>cell cycle</strong> into the search bar.
          </Step>
          <Step>
            View results across networks, users, and groups in separate tabs.
          </Step>
          <Step>
            Hover over a network name to preview its description.
          </Step>
          <Step>
            Use <strong>Browse</strong> to explore all available content.
          </Step>
          <Step>
            Try <strong>Search Examples</strong> for advanced queries.
          </Step>
        </div>
      </section>

      {/* Viewing */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Viewing a Network</h2>

        <div className="p-5 rounded-xl border bg-muted/30 space-y-3">
          <p className="text-muted-foreground">
            Click any network to open its detail view.
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Inspect metadata and descriptions in the side panel</li>
            <li>View references and network properties</li>
            <li>Switch to table view using the <strong>Table</strong> button</li>
          </ul>
        </div>
      </section>

      {/* Query */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Running a Query</h2>

        <p className="text-muted-foreground">
          Use the query controls to explore relationships within a network.
        </p>

        <div className="p-5 rounded-xl border bg-muted/30 space-y-2">
          <p className="text-sm text-muted-foreground">
            Example:
          </p>
          <p className="text-sm">
            Enter <strong>akt</strong> → choose{' '}
            <strong>1-step neighborhood</strong> → click{' '}
            <strong>Run Query</strong>
          </p>
        </div>
      </section>

      {/* Resources */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Additional Resources</h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <DocLink
            title="User Manuals"
            links={[
              { label: 'Creating an Account', href: 'https://home.ndexbio.org/create-an-ndex-account/' },
              { label: 'Finding and Querying', href: 'https://home.ndexbio.org/finding-and-querying-networks/' },
              { label: 'Uploading and Sharing', href: 'https://home.ndexbio.org/sharing-and-accessing-networks/' },
              { label: 'Groups', href: 'https://home.ndexbio.org/creating-and-using-groups/' },
              { label: 'Publishing', href: 'https://home.ndexbio.org/publishing-in-ndex/' },
            ]}
          />

          <DocLink
            title="Developers"
            links={[
              { label: 'Best Practices', href: 'https://home.ndexbio.org/readme-developers-best-practices/' },
              { label: 'NDEx API', href: 'https://home.ndexbio.org/using-the-ndex-server-api/' },
              { label: 'OpenAPI (Swagger)', href: 'https://www.ndexbio.org/rest/swagger/index.html' },
              { label: 'CX Data Model', href: 'https://home.ndexbio.org/data-model/' },
            ]}
          />

          <DocLink
            title="Releases & Legal"
            links={[
              { label: 'Release Notes', href: 'https://home.ndexbio.org/release-notes/' },
              { label: 'License & Privacy', href: 'https://home.ndexbio.org/disclaimer-license/' },
            ]}
          />
        </div>
      </section>
    </div>
  )
}

/* --- Components --- */

function Step({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
      <p className="text-muted-foreground text-sm leading-relaxed">
        {children}
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
    <div className="rounded-xl border p-5 bg-card hover:shadow-sm transition">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}