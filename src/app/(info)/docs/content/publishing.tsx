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
          content:
            'NDEx provides features to support publishing network data. While often tied to research articles, networks can also be published independently. This is useful for datasets generated continuously or through automated pipelines.',
        },

        {
          title: 'Public Distribution',
          content:
            'Networks can be private or public. Public networks can be searchable or not searchable. Full indexing allows searching by node names or identifiers but is resource-intensive.',
          steps: [
            'Open your network page',
            'Click the edit (pencil) icon',
            'Fill required fields (Name, Description, Version)',
            'Set visibility to PUBLIC or PUBLIC (not searchable)',
            'Optionally enable Full Index',
            'Click Save (may take time for large networks)',
          ],
          images: [
            'Edit network properties button',
            'Visibility dropdown selection',
            'Full index option and warning dialog',
          ],
          note: 'Full indexing is resource-intensive—use carefully.',
        },

        {
          title: 'Peer-reviewed Journal Articles',
          content:
            'NDEx supports publication workflows by enabling storage, sharing, and DOI assignment. Authors benefit from integration with Cytoscape and simplified data sharing, while publishers benefit from improved review workflows and direct linking to networks.',
        },

        {
          title: 'Load and Store Networks',
          steps: [
            'Create an NDEx account',
            'Upload networks using Python, R, or Cytoscape apps',
            'Use NDEx web uploader for CX files',
          ],
          images: ['Network upload methods overview'],
        },

        {
          title: 'Submit Networks (Sharable URLs)',
          content:
            'Sharable URLs allow temporary private access for reviewers or collaborators.',
          steps: [
            'Open network page',
            'Click Share icon → Share',
            'Enable Sharable URL',
            'Copy and share the URL',
            'Only share with trusted individuals',
          ],
          images: [
            'Share menu',
            'Enable sharable URL button',
            'Copy URL interface',
          ],
          note: 'Anyone with the link can access the network.',
        },

        {
          title: 'Acceptance and Publication',
          content:
            'After acceptance, you can request a DOI to include in your publication. This ensures long-term access and immutability.',
        },

        {
          title: 'Requesting a DOI',
          content:
            'Requesting a DOI makes your network immutable and ensures long-term accessibility.',
          steps: [
            'Open network → Share → Request DOI',
            'Fill required metadata fields (Title, Description, Version, Author)',
            'Select Rights and Rights Holder',
            'Optionally add a reference',
            'Submit request',
            'Wait for DOI assignment confirmation',
          ],
          images: [
            'Request DOI button',
            'DOI metadata form',
            'DOI assigned view',
          ],
          note:
            'After DOI is assigned, the network cannot be modified. To make changes, clone the network and request a new DOI.',
        },

        {
          title: 'Reference: Adding Publication Info',
          content:
            'You can add publication references before or after requesting a DOI. Authors are encouraged to include full citation details if available.',
          steps: [
            'Add publication reference before DOI request if possible',
            'Optionally allow one-time update after DOI request',
            'Ensure accuracy before final submission',
          ],
          images: ['Reference metadata form'],
        },

        {
          title: 'Rights and Licenses',
          content:
            'A license is required when requesting a DOI. NDEx supports multiple standard licenses or custom URLs.',
          steps: [
            'Choose a Creative Commons license (recommended)',
            'Or select an open-source license (MIT, GPL, Apache, etc.)',
            'Or provide a custom license URL',
          ],
          images: ['License selection dropdown'],
        },
      ]}
    />
  )
}