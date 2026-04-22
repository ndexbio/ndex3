'use client'

import Link from 'next/link'
import { Mail, Bug, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-8">
        Have a question, suggestion, or want to start a collaboration? We&apos;d
        love to hear from you.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">General Inquiries</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For general questions, tech support, feature suggestions,
            collaboration requests, or DOI inquiries.
          </p>
          <a
            href="mailto:support@ndexbio.org?subject=NDEx%20Inquiry"
            className="inline-flex items-center gap-2 mt-auto text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            support@ndexbio.org
          </a>
        </div>

        <div className="rounded-lg border bg-card p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Report a Bug</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Found a bug? Please include your OS, browser, and as many details as
            possible to help us identify and reproduce the issue.
          </p>
          <a
            href="mailto:support@ndexbio.org?subject=NDEx%20Bug%20Report&body=Name%3A%20%0AOS%3A%20%0ABrowser%3A%20%0AProduct%20(NDEx%20WebApp%20%2F%20IQuery%20%2F%20CyNDEx)%3A%20%0A%0ABug%20Description%3A%0A"
            className="inline-flex items-center gap-2 mt-auto text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            Email a bug report
          </a>
        </div>
      </div>

      <div className="mt-8 rounded-lg border bg-muted/50 p-6">
        <h2 className="text-lg font-semibold mb-2">Follow Us</h2>
        <div className="flex gap-4">
          <a
            href="https://twitter.com/NDExProject"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Twitter / X
          </a>
          <a
            href="https://www.youtube.com/@ndexproject"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            YouTube
          </a>
        </div>
      </div>
    </div>
  )
}