import DocTemplate from '../components/DocTemplate'
import uploadMenu from '@/images/upload_menu.png'
import uploadPopup from '@/images/upload_popup.png'
import sharableLink from '@/images/sharable_network_link.png'
import shareUsersPermissions from '@/images/share_users_permissions.png'

export default function SharingAndAccessingPage() {
  return (
    <DocTemplate
      title="Uploading and Sharing Networks"
      description="Learn how to upload, share, and manage access to networks in NDEx"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  There are several ways to upload and share networks in NDEx.
                  Users have full control over who can access their networks
                  and can grant permissions for collaboration or request access
                  to networks owned by others.
                  <br />
                  <br />
                  A free NDEx account is required. See the{' '}
                  <a
                    href="/docs/create-an-ndex-account"
                    className="text-primary hover:underline"
                  >
                    Creating an Account
                  </a>{' '}
                  guide for details.
                </>
              ),
            },
          ],
        },
        {
          title: 'Uploading via Cytoscape',
          blocks: [
              {
                type: 'text',
                content: (
                  <>
                    The easiest way to upload networks is through Cytoscape. Cytoscape 3.7+
                    includes built-in NDEx integration via the CyNDEx-2 app, making upload
                    fast and simple. A quick guide with screenshots is available in the{' '}
                    <a
                      href="https://apps.cytoscape.org/apps/cyndex2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      CyNDEx-2 App Store
                    </a>{' '}
                    page; alternatively, instructions can also be found in the{' '}
                    <a
                      href="https://manual.cytoscape.org/en/stable/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Cytoscape Online Manual
                    </a>
                    .
                  </>
                ),
              },
            {
              type: 'steps',
              steps: [
                'Open your network in Cytoscape',
                'Use the NDEx integration to upload',
                'Follow prompts to publish your network',
              ],
            },
          ],
        },
        {
          title: 'Uploading Programmatically',
          blocks: [
            {
              type: 'text',
              content:
                'Advanced users can upload networks using the NDEx REST API with Java, Python, R, or JavaScript clients.',
            },
            {
              type: 'steps',
              steps: [
                'Use NDEx REST API',
                'Choose a supported client library (Java, Python, R)',
                'Authenticate and upload networks via script',
              ],
            },
          ],
        },
        {
          title: 'Uploading via Web Interface',
          blocks: [
            {
              type: 'text',
              content:
                'The NDEx web UI currently supports uploading networks in CX format.',
            },
            {
              type: 'steps',
              steps: [
                'Click "+ New" → "Upload Networks" in My Drive',
                'Select a CX2 file',
                'Click "Import Network"',
                'Wait for processing to complete',
                'Check status indicators (success, warning, or error)',
              ],
            },
            {
              type: 'image',
              image: {
                src: uploadMenu,
                alt: 'Upload networks button',
              },
            },
            {
              type: 'image',
              image: {
                src: uploadPopup,
                alt: 'Upload browser',
              },
            },
          ],
        },
        {
          title: 'Sharing Networks Externally (Sharable URLs)',
          blocks: [
            {
              type: 'text',
              content:
                'You can share private networks using a secure sharable URL, similar to Google Docs or Dropbox.',
            },
            {
              type: 'steps',
              steps: [
                'Click the ⋮ Actions menu for the network (from My Drive or search results)',
                'Click "Share"',
                'Check "Anyone with the link" to generate a sharable URL',
                'Click "Copy link" and distribute it',
                'Share only with trusted users',
              ],
            },
            {
              type: 'image',
              image: { src: sharableLink, alt: 'Share menu option' },
            },
            {
              type: 'note',
              content: 'Anyone with the link can access the network.',
            },
          ],
        },
        {
          title: 'Sharing within NDEx',
          blocks: [
            {
              type: 'text',
              content:
                'You can share networks directly with NDEx users using permissions.',
            },
            {
              type: 'steps',
              steps: [
                'Click the ⋮ Actions menu for a network → "Share"',
                'Type an email or username in the "Add people" field',
                'Select a user from the autocomplete suggestions',
                'Set the permission level (Read, Edit, or Transfer ownership) — use the dropdown to also remove access',
                'Click "Done"',
              ],
            },
            {
              type: 'image',
              image: {
                src: shareUsersPermissions,
                alt: 'User/group sharing interface',
              },
            },
            {
              type: 'note',
              content: 'Permissions for sharing folders and shortcuts are also done via this method. All subfiles within a folder will be shared as well. This is useful for sharing multiple networks at once with the same users.',
            },
          ],
        },
      ]}
    />
  )
}