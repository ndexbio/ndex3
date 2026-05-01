import DocTemplate from '../components/DocTemplate'

export default function DevelopersBestPracticesPage() {
  return (
    <DocTemplate
      title="Developing in NDEx"
      description="Best practices for developers integrating with NDEx"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx is designed to integrate into applications such as scripts, notebooks, web apps, services, and Cytoscape apps. It enables workflows that retrieve, analyze, and store biological networks.',
            },
            {
              type: 'steps',
              steps: [
                'Generate or input a gene list',
                'Retrieve an interactome network (e.g. BioGRID)',
                'Map genes to nodes',
                'Compute subnetworks (e.g. neighborhood analysis)',
                'Apply visual styling',
                'Apply layout',
                'Save results back to NDEx',
              ],
            },
          ],
        },
        {
          title: 'Responsible Practices',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx is a shared public resource. Applications should be designed to minimize unnecessary load and optimize performance.',
            },
            {
              type: 'steps',
              steps: [
                'Cache results of repeated requests',
                'Prefer fewer large requests over many small ones',
                'Limit data retrieval to only what is needed',
                'Use test servers for heavy workloads',
                'Run a local NDEx server for intensive testing if needed',
              ],
            },
            {
              type: 'note',
              content:
                'Efficient design improves both your app performance and overall system stability.',
            },
          ],
        },
        {
          title: 'Working with the NDEx API',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  Applications interact with NDEx via a REST API using the CX
                  data format. Learn more about the{' '}
                  <a
                    href="/docs/data-model"
                    className="text-primary hover:underline"
                  >
                    CX Data Model
                  </a>{' '}
                  and{' '}
                  <a
                    href="/docs/using-the-ndex-api"
                    className="text-primary hover:underline"
                  >
                    NDEx API
                  </a>
                  .
                </>
              ),
            },
            {
              type: 'steps',
              steps: [
                'Retrieve only required network aspects (edges, nodes, etc.)',
                'Avoid fetching unnecessary attributes',
                'Use API parameters to reduce payload size',
              ],
            },
          ],
        },
        {
          title: 'Python Client',
          blocks: [
            {
              type: 'text',
              content:
                'The ndex2 Python client simplifies interaction with NDEx and supports Pandas and NetworkX.',
            },
            {
              type: 'steps',
              steps: [
                'Install ndex2 via pip (Python 3)',
                'Use built-in methods for common operations',
              ],
            },
            {
              type: 'note',
              content: (
                <>
                  For more information on the ndex2 python client see the {' '}
                  <a
                    href="https://ndex2.readthedocs.io/en/latest/"
                    className="text-primary hover:underline"
                  >
                    Read The Docs page
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://github.com/ndexbio/ndex2-client"
                    className="text-primary hover:underline"
                  >
                    Github
                  </a>
                  .
                </>
              ),
           },
            {
              type: 'note',
              content:
                'Legacy ndex v3.1 client exists but is deprecated for new development.',
            },
          ],
        },
        {
          title: 'Unique Identifiers (UUIDs)',
          blocks: [
            {
              type: 'text',
              content:
                'All NDEx objects (networks, users, groups) are assigned UUIDs. These identifiers ensure global uniqueness and allow referencing via stable URIs.',
            },
            {
              type: 'steps',
              steps: [
                'Each network has a unique UUID',
                'Copies of networks receive new UUIDs',
                'UUIDs enable tracking of network provenance',
                'Stable server URIs are recommended',
              ],
            },
          ],
        },
        {
          title: 'Copying Networks',
          blocks: [
            {
              type: 'text',
              content:
                'When a network is copied, it receives a new UUID. This supports tracking of network history and provenance.',
            },
          ],
        },
        {
          title: 'Final Notes',
          blocks: [
            {
              type: 'text',
              content:
                'Thank you for developing on NDEx and contributing to a better ecosystem for network data sharing.',
            },
          ],
        },
      ]}
    />
  )
}