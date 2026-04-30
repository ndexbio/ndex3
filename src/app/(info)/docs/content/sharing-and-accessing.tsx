import DocTemplate from '../components/DocTemplate'

export default function SharingAndAccessingPage() {
  return (
    <DocTemplate
      title="Uploading and Sharing Networks"
      description="Learn how to upload, share, and manage access to networks in NDEx"
      lastUpdated="December 12, 2018"
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
              content:
                'The easiest way to upload networks is through Cytoscape. Cytoscape 3.7+ includes built-in NDEx integration via the CyNDEx-2 app, making upload fast and simple.',
            },
            {
              type: 'steps',
              steps: [
                'Open your network in Cytoscape',
                'Use the NDEx integration to upload',
                'Follow prompts to publish your network',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Cytoscape upload workflow',
                alt: 'Cytoscape upload workflow',
              },
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
                'Click "Upload Networks" in My Account',
                'Select CX file(s)',
                'Click "Upload All"',
                'Wait for processing to complete',
                'Check status indicators (success, warning, or error)',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Upload networks button',
                alt: 'Upload networks button',
              },
            },
            {
              type: 'image',
              image: {
                src: 'Upload results status indicators',
                alt: 'Upload results status indicators',
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
                'Open your network',
                'Click "More" → "Share"',
                'Enable Sharable URL',
                'Copy and distribute the link',
                'Share only with trusted users',
              ],
            },
            {
              type: 'image',
              image: { src: 'Share menu option', alt: 'Share menu option' },
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
              image: { src: 'Copy URL interface', alt: 'Copy URL interface' },
            },
            {
              type: 'image',
              image: {
                src: 'Shared network view',
                alt: 'Shared network view',
              },
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
                'You can share networks directly with NDEx users or groups using permissions.',
            },
            {
              type: 'steps',
              steps: [
                'Open network → click "More" → "Share"',
                'Search for users or groups',
                'Click "Add"',
                'Assign permission level (read, edit, admin)',
                'Click "Save Changes"',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'User/group sharing interface',
                alt: 'User/group sharing interface',
              },
            },
          ],
        },
        {
          title: 'Requesting Access to a Network',
          blocks: [
            {
              type: 'text',
              content:
                'If you need higher permissions on a network, you can request access.',
            },
            {
              type: 'steps',
              steps: [
                'Open the network',
                'Click "More" → "Upgrade permission"',
                'Add a message explaining your request',
                'Submit request',
                'Track status in Tasks & Notifications',
              ],
            },
            {
              type: 'image',
              image: {
                src: 'Access request dialog',
                alt: 'Access request dialog',
              },
            },
            {
              type: 'image',
              image: {
                src: 'Tasks & notifications panel',
                alt: 'Tasks & notifications panel',
              },
            },
          ],
        },
        {
          title: 'Granting Access to a Network',
          blocks: [
            {
              type: 'text',
              content:
                'As a network owner, you can approve or deny access requests from others.',
            },
            {
              type: 'steps',
              steps: [
                'Go to "Tasks & Notifications"',
                'Review incoming requests',
                'Open request details',
                'Accept or decline',
                'Optionally add a message',
              ],
            },
            {
              type: 'image',
              image: { src: 'Grant access dialog', alt: 'Grant access dialog' },
            },
            {
              type: 'note',
              content:
                'Be cautious when granting edit access—users can modify your network.',
            },
          ],
        },
      ]}
    />
  )
}