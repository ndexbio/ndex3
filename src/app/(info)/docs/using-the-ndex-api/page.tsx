import DocTemplate from '../components/DocTemplate'

export default function UsingNdexApiPage() {
  return (
    <DocTemplate
      title="Using the NDEx API"
      description="Overview of the NDEx 3.0 REST API and how to work with networks programmatically"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  The NDEx 3.0 REST API allows applications to create, retrieve,
                  update, and manage networks programmatically.
                  <br />
                  <br />
                  For full endpoint details, visit the{' '}
                  <a
                    href="https://www.ndexbio.org/rest/swagger/index.html#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    API Swagger Documentation
                  </a>
                  .
                </>
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