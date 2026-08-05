'use client'

import Link from 'next/link'
import Image from 'next/image'
import DocsFooter from './components/DocsFooter'
import anonSearch from '@/images/anonymous_search.png'
import networkViewer from '@/images/network_viewer.png'
import networkViewerQuery from '@/images/viewer_query.png'
import networkViewerQueryResult from '@/images/viewer_query_result.png'

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
          Last updated: April 2026
        </p>
      </header>

      {/* Intro */}
      <section className="space-y-4">
        <p className="text-muted-foreground leading-relaxed">
          Welcome to NDEx! This guide walks you through how to search, explore,
          and analyze biological networks.
        </p>
        <p className="text-muted-foreground">
          Building against the NDEx REST API? See{' '}
          <Link
            href="/docs/using-the-ndex-api"
            className="text-primary hover:underline"
          >
            Using the NDEx API
          </Link>{' '}
          for developer documentation.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          If you used an earlier version of NDEx, the way content is organized
          has changed. <strong>Network sets and groups are gone</strong>, and{' '}
          <strong>folders</strong> are now the single way to collect and
          organize your networks &mdash; anything you had in a set or a group is
          already a folder, under the same link. You share a folder itself, with
          specific people or by link, and each network, folder, and shortcut has
          its own visibility &mdash; public, unlisted, or private &mdash; that
          controls who can find and open it. For more detail on what changed,
          see the{' '}
          <a
            href="https://github.com/ndexbio/ndex-rest/blob/master/docs/V3-Migration-Guide.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            NDEx v3 Migration Guide
          </a>
          .
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
            <>Browse results — networks, folders, and shortcuts matching your search are shown</>,
          ]}
        />
        <Image src={anonSearch} alt="Anonymous search example" />
      </section>

      {/* View */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">2. View a Network</h2>

        <StepList
          steps={[
            <>Double-click any public network to open it</>,
            <>Review metadata in the right-side panel</>,
            <>Scroll to explore references and properties</>,
          ]}
        />
        <Image src={networkViewer} alt="Network viewer" />
      </section>

      {/* Query */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">3. Run a Query</h2>

        <StepList
          steps={[
            <>Use the query input box at the bottom of the network viewer</>,
            <>
              Enter one or more terms to query the network and select a query type from the dropdown.
            </>,
            <>
              Enter a term like <strong>akt</strong> and select <strong>1-Step Neighborhood</strong>. The query will find a neighborhood around all nodes that reference the akt term.
            </>,
            <>
              Click the search icon to run the query
            </>,
          ]}
        />

        <Image src={networkViewerQuery} alt="Query input" />
        <div className="p-5 rounded-xl border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            This will return a subnetwork showing related nodes and edges.
          </p>
        </div>

        <Image src={networkViewerQueryResult} alt="Result of query" />
        <div className="p-5 rounded-xl border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Additional useful information (such as citations) can be obtained by selecting individual or multiple nodes and edges.
          </p>
        </div>

      </section>

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
          <div className="text-xs font-medium text-primary mt-1">{i + 1}.</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {step}
          </p>
        </div>
      ))}
    </div>
  )
}