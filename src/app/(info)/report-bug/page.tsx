'use client'

import Link from 'next/link'
import { Bug, Mail, AlertTriangle } from 'lucide-react'

export default function ReportBugPage() {
  const mailtoHref =
    'mailto:support@ndexbio.org?subject=NDEx%20Bug%20Report&body=' +
    encodeURIComponent(
      `Name: 
OS: 
Browser: 
Product (NDEx WebApp / IQuery / CyNDEx): 

Bug Description:
Please provide as many details as possible to help us identify and reproduce the bug.

`
    )

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Report a Bug</h1>

      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 mb-8 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <p className="text-sm">
          Please use this page <strong>only</strong> to report bugs. For all
          other inquiries, use our{' '}
          <Link href="/contact" className="text-primary hover:underline font-medium">
            contact page
          </Link>{' '}
          instead.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bug className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Bug Report</h2>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          To help us identify and fix the issue, please include the following
          information in your report:
        </p>

        <ul className="text-sm text-muted-foreground space-y-1.5 mb-6 ml-4 list-disc">
          <li>Your <strong>name</strong> and <strong>email</strong></li>
          <li>Your <strong>operating system</strong> (e.g. macOS 15, Windows 11, Ubuntu 24)</li>
          <li>Your <strong>web browser</strong> (e.g. Chrome, Firefox, Safari)</li>
          <li>
            Which <strong>product</strong> you were using (NDEx WebApp, IQuery,
            or CyNDEx)
          </li>
          <li>
            A detailed <strong>description</strong> of the bug — steps to
            reproduce, what you expected vs. what happened, and any screenshots
            or error messages
          </li>
        </ul>

        <a
          href={mailtoHref}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Mail className="h-4 w-4" />
          Open Bug Report Email
        </a>
      </div>
    </div>
  )
}