'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          NDEx — The Network Data Exchange
        </h1>
        <p className="text-muted-foreground">
          An open platform for sharing and publishing biological network data
        </p>
        <p className="text-xs text-muted-foreground italic">
          Last updated: May 11, 2022
        </p>
      </header>

      {/* Overview */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          NDEx provides an open-source framework where scientists and
          organizations can store, share, manipulate, and publish biological
          network knowledge.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          It creates a home for models that would otherwise exist only as
          figures, tables, or supplementary material — enabling reuse and deeper
          exploration.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Rather than replacing resources like Pathway Commons, KEGG, or
          Reactome, NDEx acts as a shared distribution layer that preserves
          attribution.
        </p>
      </section>

      {/* Why NDEx */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Why NDEx?</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl border bg-muted/30">
            <h3 className="font-semibold mb-2">Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Think of NDEx as a “Dropbox for networks” — share privately or
              collaborate with teams easily.
            </p>
          </div>

          <div className="p-5 rounded-xl border bg-muted/30">
            <h3 className="font-semibold mb-2">Free Storage</h3>
            <p className="text-sm text-muted-foreground">
              Get 10 GB of free cloud storage to manage and organize your
              network data.
            </p>
          </div>

          <div className="p-5 rounded-xl border bg-muted/30">
            <h3 className="font-semibold mb-2">Easy Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Share networks via simple URLs — no login required for viewers.
            </p>
          </div>

          <div className="p-5 rounded-xl border bg-muted/30">
            <h3 className="font-semibold mb-2">Public Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Explore networks on the{' '}
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
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Distribution & Publishing</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            NDEx supports FAIR data principles and is registered with FAIRsharing.org.
          </p>
          <p>
            Public networks receive stable URLs and can be accessed manually or
            via a REST API.
          </p>
          <p>
            You can attach licenses, request DOIs, and link datasets directly in
            publications.
          </p>
        </div>
      </section>

      {/* Integrations */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Cytoscape Integration</h2>
        <p className="text-muted-foreground leading-relaxed">
          NDEx integrates directly with Cytoscape, allowing seamless transfer of
          networks between desktop and cloud while preserving layouts and styles.
        </p>
        <a
          href="https://apps.cytoscape.org/apps/cyndex2"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-primary hover:underline"
        >
          Learn more →
        </a>
      </section>

      {/* Programmatic */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Programmatic Access</h2>
        <p className="text-muted-foreground leading-relaxed">
          NDEx provides a REST API and client libraries for Python, R, Java, and
          JavaScript, enabling integration into workflows and pipelines.
        </p>
      </section>

      {/* Citations */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">How to Cite</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>
            <a
              href="https://doi.org/10.1093/bioinformatics/btad118"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              NDEx IQuery (2023)
            </a>
          </li>
          <li>
            <a
              href="https://doi.org/10.1002/cpz1.258"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              NDEx Workflows (2021)
            </a>
          </li>
          <li>
            <a
              href="https://doi.org/10.1158/0008-5472.CAN-17-0606"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              NDEx 2.0 (2017)
            </a>
          </li>
        </ul>
      </section>
    </div>
  )
}