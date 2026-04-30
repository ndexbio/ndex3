'use client'

import Link from 'next/link'
import DocsFooter from './DocsFooter'

export default function DocTemplate({
  title,
  description,
  lastUpdated,
  sections,
}: {
  title: string
  description?: string
  lastUpdated?: string
  sections: {
    title: string
    content?: React.ReactNode
    steps?: (React.ReactNode | string)[]
    images?: string[]
    note?: string
  }[]
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground italic">
            Last updated: {lastUpdated}
          </p>
        )}
      </header>

      {sections.map((section, i) => (
        <section key={i} className="space-y-6">
          <h2 className="text-2xl font-semibold">{section.title}</h2>

          {section.content && (
            <div className="text-muted-foreground">
              {section.content}
            </div>
          )}

          {section.steps && <StepList steps={section.steps} />}

          {section.note && (
            <div className="p-5 rounded-xl border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {section.note}
              </p>
            </div>
          )}

          {section.images?.map((img, idx) => (
            <ImagePlaceholder key={idx} label={img} />
          ))}
        </section>
      ))}

      <DocsFooter />
      <section>
        <Link href="/docs" className="text-primary hover:underline text-sm">
          ← Back to QuickStart
        </Link>
      </section>
    </div>
  )
}

/* --- Shared UI --- */

function StepList({ steps }: { steps: (React.ReactNode | string)[] }) {
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