import DocTemplate from '../components/DocTemplate'

export default function PublishingPage() {
  return (
    <DocTemplate
      title="Publishing in NDEx"
      description="Learn how to publish networks, request DOIs, and manage visibility in NDEx"
      lastUpdated="February 15, 2024"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx provides features to support publishing network data. While often tied to research articles, networks can also be published independently. This is useful for datasets generated continuously or through automated pipelines.',
            },
          ],
        },
        {
          title: 'Public Distribution',
          blocks: [
            {
              type: 'text',
              content:
                'Networks can be private or public. Public networks can be searchable or not searchable. Full indexing allows searching by node names or identifiers but is resource-intensive.',
            },
            {
              type: 'steps',
              steps: [
                'Open your network page',
                'Click the edit (pencil) icon',
                'Fill required fields (Name, Description, Version)',
                'Set visibility to PUBLIC or PUBLIC (not searchable)',
                'Optionally enable Full Index',
                'Click Save (may take time for large networks)',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Edit network properties button',
                alt: 'Edit network properties button',
              },
            },
            {
              type: 'image',
              image: {
                src: 'Visibility dropdown selection',
                alt: 'Visibility dropdown selection',
              },
            },
            {
              type: 'image',
              image: {
                src: 'Full index option and warning dialog',
                alt: 'Full index option and warning dialog',
              },
            },
            {
              type: 'note',
              content: 'Full indexing is resource-intensive—use carefully.',
            },
          ],
        },
        {
          title: 'Peer-reviewed Journal Articles',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx supports publication workflows by enabling storage, sharing, and DOI assignment. Authors benefit from integration with Cytoscape and simplified data sharing, while publishers benefit from improved review workflows and direct linking to networks.',
            },
          ],
        },
        {
          title: 'Load and Store Networks',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Create an NDEx account',
                'Upload networks using Python, R, or Cytoscape apps',
                'Use NDEx web uploader for CX files',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Network upload methods overview',
                alt: 'Network upload methods overview',
              },
            },
          ],
        },
        {
          title: 'Submit Networks (Sharable URLs)',
          blocks: [
            {
              type: 'text',
              content:
                'Sharable URLs allow temporary private access for reviewers or collaborators.',
            },
            {
              type: 'steps',
              steps: [
                'Open network page',
                'Click Share icon → Share',
                'Enable Sharable URL',
                'Copy and share the URL',
                'Only share with trusted individuals',
              ],
            },
            {
              type: 'image',
              image: { src: 'Share menu', alt: 'Share menu' },
            },
            {
              type: 'image',
              image: {
                src: 'Enable sharable URL button',
                alt: 'Enable sharable URL button',
              },
            },
            {
              type: 'image',
              image: {
                src: 'Copy URL interface',
                alt: 'Copy URL interface',
              },
            },
            {
              type: 'note',
              content: 'Anyone with the link can access the network.',
            },
          ],
        },
        {
          title: 'Acceptance and Publication',
          blocks: [
            {
              type: 'text',
              content:
                'After acceptance, you can request a DOI to include in your publication. This ensures long-term access and immutability.',
            },
          ],
        },
        {
          title: 'Requesting a DOI',
          blocks: [
            {
              type: 'text',
              content:
                'Requesting a DOI makes your network immutable and ensures long-term accessibility.',
            },
            {
              type: 'steps',
              steps: [
                'Open network → Share → Request DOI',
                'Fill required metadata fields (Title, Description, Version, Author)',
                'Select Rights and Rights Holder',
                'Optionally add a reference',
                'Submit request',
                'Wait for DOI assignment confirmation',
              ],
            },
            {
              type: 'image',
              image: { src: 'Request DOI button', alt: 'Request DOI button' },
            },
            {
              type: 'image',
              image: { src: 'DOI metadata form', alt: 'DOI metadata form' },
            },
            {
              type: 'image',
              image: { src: 'DOI assigned view', alt: 'DOI assigned view' },
            },
            {
              type: 'note',
              content:
                'After DOI is assigned, the network cannot be modified. To make changes, clone the network and request a new DOI.',
            },
          ],
        },
        {
          title: 'Reference: Adding Publication Info',
          blocks: [
            {
              type: 'text',
              content:
                'You can add publication references before or after requesting a DOI. Authors are encouraged to include full citation details if available.',
            },
            {
              type: 'steps',
              steps: [
                'Add publication reference before DOI request if possible',
                'Optionally allow one-time update after DOI request',
                'Ensure accuracy before final submission',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Reference metadata form',
                alt: 'Reference metadata form',
              },
            },
          ],
        },
        {
          title: 'Rights and Licenses',
          blocks: [
            {
              type: 'text',
              content:
                'A license is required when requesting a DOI. NDEx supports multiple standard licenses or custom URLs.',
            },
            {
              type: 'steps',
              steps: [
                'Choose a Creative Commons license (recommended)',
                'Or select an open-source license (MIT, GPL, Apache, etc.)',
                'Or provide a custom license URL',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'License selection dropdown',
                alt: 'License selection dropdown',
              },
            },
          ],
        },
      ]}
    />
  )
}