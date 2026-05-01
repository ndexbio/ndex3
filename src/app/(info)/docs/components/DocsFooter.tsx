'use client'

import Link from 'next/link'

export default function DocsFooter() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">More Documentation</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <DocLink
          title="User Manuals"
          links={[
            { label: 'Creating an Account', href: '/docs/create-an-ndex-account' },
            { label: 'Finding and Querying', href: '/docs/finding-and-querying' },
            { label: 'Uploading and Sharing', href: '/docs/sharing-and-accessing' },
            { label: 'Publishing', href: '/docs/publishing' },
          ]}
        />

        <DocLink
          title="Developers"
          links={[
            { label: 'Best Practices', href: '/docs/developers-best-practices' },
            { label: 'NDEx API', href: '/docs/using-the-ndex-api' },
            { label: 'OpenAPI', href: 'https://www.ndexbio.org/rest/swagger/index.html' },
            { label: 'CX Data Model', href: '/docs/data-model' },
          ]}
        />
      </div>
    </section>
  )
}

/* keep this inside or extract too */
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