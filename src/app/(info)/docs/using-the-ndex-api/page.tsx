'use client'

import DocTemplate from '../components/DocTemplate'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { getSwaggerUrl } from '@/lib/utils/swagger-url'

export default function UsingNdexApiPage() {
  const config = useConfig()
  const swaggerUrl = getSwaggerUrl(config.ndexBaseUrl, config.swaggerBaseName)

  return (
    <DocTemplate
      title="Using the NDEx API"
      description="Overview of the NDEx 3.0 REST API and how to work with networks programmatically"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Before You Begin: v2 vs. v3',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  NDEx 3 is a major architectural upgrade to the platform and
                  its REST API. The <strong>v2 API remains available</strong>{' '}
                  for backwards compatibility, so existing applications keep
                  working &mdash; but{' '}
                  <strong>v3 is the primary interface going forward</strong>, and
                  it is where new capabilities are being added.
                </>
              ),
            },
            {
              type: 'text',
              content: (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">
                    What&apos;s new in v3
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
                    <li>
                      A rewritten <code className="text-xs">/v3</code> API for
                      networks, users, search, and batch operations.
                    </li>
                    <li>
                      A <strong>folder and shortcut file system</strong> for
                      organizing content, which replaces both{' '}
                      <strong>groups</strong> and <strong>network sets</strong>{' '}
                      &mdash; those two features have been retired.
                    </li>
                    <li>
                      A unified <strong>visibility model</strong> (public,
                      unlisted, private), a trash lifecycle, and access-key link
                      sharing that applies to networks, folders, and shortcuts
                      alike.
                    </li>
                    <li>
                      Support for <strong>OIDC bearer tokens</strong> in
                      addition to the Basic authentication that v2 clients
                      already use.
                    </li>
                  </ul>
                </div>
              ),
            },
            {
              type: 'text',
              content: (
                <div className="space-y-3">
                  <p className="font-medium text-foreground">
                    How to tell if this affects you
                  </p>
                  <p className="text-sm leading-relaxed">
                    If you have built an application against the NDEx REST API
                    &mdash; either calling it directly or through the Python{' '}
                    <code className="text-xs">ndex2</code>, R, or Java clients
                    &mdash; start by checking whether it uses{' '}
                    <strong>groups</strong>, <strong>network sets</strong>,
                    showcase, or user permissions.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Two things make the move smaller than it sounds:{' '}
                    <strong>your existing UUIDs are still valid</strong> (a
                    group or network set is now a folder with the same id), and{' '}
                    <strong>Basic authentication still works on v3</strong>, so
                    you do not have to change how you authenticate just to get
                    started.
                  </p>
                </div>
              ),
            },
            {
              type: 'text',
              content: (
                <div className="space-y-3 p-6 rounded-xl border-2 border-ndex/50 bg-ndex/5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ndex">
                    Start here
                  </p>
                  <p className="text-sm leading-relaxed">
                    We strongly recommend reading the migration guide before
                    anything else on this page. It walks through exactly what
                    changed, maps each retired capability to its v3 replacement,
                    and will help you plan a migration that leaves your
                    application on the interface NDEx is building on going
                    forward.
                  </p>
                  <a
                    href="https://github.com/ndexbio/ndex-rest/blob/master/docs/V3-Migration-Guide.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-3xl bg-ndex px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2c70ac]"
                  >
                    Read the NDEx v3 Migration Guide
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              ),
            },
          ],
        },
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  The NDEx 3.0 REST API allows applications to create, retrieve,
                  update, and manage networks programmatically.
                </>
              ),
            },
            {
              type: 'text',
              content: (
                <div className="space-y-3 p-6 rounded-xl border-2 border-ndex/50 bg-ndex/5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ndex">
                    Interactive API reference
                  </p>
                  <p className="text-sm leading-relaxed">
                    Every endpoint on this server &mdash; v2 and v3, including
                    the request and response shapes and anything marked
                    deprecated &mdash; is browsable in the Swagger UI.
                  </p>
                  <a
                    href={swaggerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-3xl bg-ndex px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2c70ac]"
                  >
                    Open the NDEx API Swagger documentation
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <p className="text-xs text-muted-foreground break-all">
                    {swaggerUrl}
                  </p>
                </div>
              ),
            },
            {
              type: 'note',
              content:
                'The older v1.3 API and non-secure HTTP endpoints are deprecated.',
            },
          ],
        },
        {
          title: 'CX Network Format',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  All network data is exchanged using the CX format. This
                  format is designed to be flexible and streamable.
                  <br />
                  <br />
                  Learn more in the{' '}
                  <a
                    href="/docs/data-model"
                    className="text-primary hover:underline"
                  >
                    CX Data Model
                  </a>
                  .
                </>
              ),
            },
          ],
        },
        {
          title: 'Best Practices',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Use official client libraries (Python, R, Java)',
                'Avoid unnecessary large data transfers',
                'Use pagination (start, size) for large queries',
                'Test on NDEx test server before production',
                'Prefer batch operations where possible',
              ],
            },
          ],
        },
        {
          title: 'Available Client Libraries',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Python client (ndex2 via PyPI)',
                'Java client and object model',
                'R client (ndexR via Bioconductor)',
              ],
            },
            {
              type: 'note',
              content:
                'Client libraries simplify network I/O, search, and query operations.',
            },
          ],
        },
        {
          title: 'API Design Conventions',
          blocks: [
            {
              type: 'steps',
              steps: [
                'POST → create resources (returns 201)',
                'PUT → update resources (returns 204)',
                'DELETE → remove resources (returns 204)',
                'GET → retrieve data',
                'POST used for batch retrieval and search',
                'Async operations return 202 with task location',
              ],
            },
          ],
        },
        {
          title: 'Authentication',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Basic Auth is supported',
                'Some endpoints allow optional authentication',
              ],
            },
            {
              type: 'note',
              content:
                'Some API calls return different results depending on authentication.',
            },
          ],
        },
        {
          title: 'Core Resource Types',
          blocks: [
            {
              type: 'steps',
              steps: [
                'User → accounts, permissions, memberships',
                'Group → collaboration and access control',
                'Network → core data objects (CX format)',
                'Task → async operations and exports',
                'Folder → collections of networks (replaces deprecated Network Sets)',
              ],
            },
          ],
        },
        {
          title: 'Common Operations',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Create, update, and delete networks',
                'Manage group memberships and permissions',
                'Retrieve network summaries and full CX data',
                'Export networks in different formats',
                'Search users, groups, and networks',
              ],
            },
          ],
        },
        {
          title: 'Pagination and Performance',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Use start parameter for paging',
                'Use size parameter to limit results',
                'Default page size is 100',
                'Avoid fetching full datasets unnecessarily',
              ],
            },
          ],
        },
        {
          title: 'Error Handling',
          blocks: [
            {
              type: 'steps',
              steps: [
                '4xx errors → client issues',
                '500 errors → server issues',
                'Responses include JSON error messages',
              ],
            },
          ],
        },
      ]}
    />
  )
}