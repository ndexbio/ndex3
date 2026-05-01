import DocTemplate from '../components/DocTemplate'
import sharableLink from '@/images/sharable_network_link.png'
import uploadMenu from '@/images/upload_menu.png'
import uploadPopup from '@/images/upload_popup.png'
import requestDoi from '@/images/request_doi.png'
import requestDoiPopup from '@/images/request_doi_popup.png'

export default function PublishingPage() {
  return (
    <DocTemplate
      title="Publishing in NDEx"
      description="Learn how to publish networks, request DOIs, and manage visibility in NDEx"
      lastUpdated="April 2026"
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
                'Networks can be private or public or unlisted. Unlisted networks are public but not searchable.',
            },
            {
              type: 'steps',
              steps: [
                'Open network → click the hamburger menu → "Share"',
                'Assign visibility as PUBLIC or UNLISTED.',
                'Click "Done"',
              ],
            },
            {
              type: 'image',
              image: {
                src: sharableLink,
                alt: 'Edit network properties button',
              },
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
                src: uploadMenu,
                alt: 'Edit network properties button',
              },
            },
            {
              type: 'image',
              image: {
                src: uploadPopup,
                alt: 'Network upload methods overview',
              },
            },
            {
              type: 'note',
              content: (
                <>
                  For more information on loading and sharing networks view{' '}
                  <a
                    href="/docs/sharing-and-accessing"
                    className="text-primary hover:underline"
                  >
                     the Sharing and accessing document
                  </a>{' '}
                  guide for details.
                </>
              ),
            }
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
                'Open network hamburger menu from search or account page → Request DOI',
                'Fill required metadata fields (Title, Description, Version, Author)',
                'Select Rights and Rights Holder',
                'Optionally add a reference',
                'Submit request',
                'Wait for DOI assignment confirmation',
              ],
            },
            {
              type: 'image',
              image: { src: requestDoi, alt: 'Request DOI button' },
            },
            {
              type: 'image',
              image: { src: requestDoiPopup, alt: 'DOI metadata form' },
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
          ],
        },
      ]}
    />
  )
}