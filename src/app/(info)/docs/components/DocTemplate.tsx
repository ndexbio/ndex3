'use client'

import Link from 'next/link'
import Image, { StaticImageData } from 'next/image'
import DocsFooter from './DocsFooter'

type DocImage = string | StaticImageData

type DocImageBlockData = {
  src: DocImage
  alt: string
  caption?: string
}

type DocBlock =
  | { type: 'text'; content: React.ReactNode }
  | { type: 'steps'; steps: (React.ReactNode | string)[] }
  | { type: 'image'; image: DocImageBlockData }
  | { type: 'note'; content: React.ReactNode }

type DocSection = {
  title: string
  blocks: DocBlock[]
}

export default function DocTemplate({
  title,
  description,
  lastUpdated,
  sections,
}: {
  title: string
  description?: string
  lastUpdated?: string
  sections: DocSection[]
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
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
          {section.blocks.map((block, j) => (
            <BlockRenderer key={j} block={block} sectionTitle={section.title} />
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

function BlockRenderer({
  block,
  sectionTitle,
}: {
  block: DocBlock
  sectionTitle: string
}) {
  switch (block.type) {
    case 'text':
      return <div className="text-muted-foreground">{block.content}</div>
    case 'steps':
      return <StepList steps={block.steps} />
    case 'image':
      return <DocImageBlock image={block.image} sectionTitle={sectionTitle} />
    case 'note':
      return (
        <div className="p-5 rounded-xl border bg-muted/30">
          <p className="text-sm text-muted-foreground">{block.content}</p>
        </div>
      )
  }
}

function StepList({ steps }: { steps: (React.ReactNode | string)[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="text-xs font-medium text-primary mt-1">{i + 1}.</div>
          <p className="text-muted-foreground text-sm leading-relaxed">{step}</p>
        </div>
      ))}
    </div>
  )
}

function DocImageBlock({
  image,
  sectionTitle,
}: {
  image: DocImageBlockData
  sectionTitle: string
}) {
  if (typeof image.src === 'string') {
    return <ImagePlaceholder label={image.src} />
  }

  return (
    <figure className="space-y-2">
      <div className="rounded-xl border bg-muted/20 overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt || `${sectionTitle} illustration`}
          className="w-full h-auto"
          placeholder="blur"
        />
      </div>
      {image.caption && (
        <figcaption className="text-xs text-muted-foreground italic text-center">
          {image.caption}
        </figcaption>
      )}
    </figure>
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