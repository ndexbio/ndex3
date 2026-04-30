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
          content: (
            <>
              There are several ways to upload and share networks in NDEx. Users
              have full control over who can access their networks and can grant
              permissions for collaboration or request access to networks owned
              by others.
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

        {
          title: 'Uploading via Cytoscape',
          content:
            'The easiest way to upload networks is through Cytoscape. Cytoscape 3.7+ includes built-in NDEx integration via the CyNDEx-2 app, making upload fast and simple.',
          steps: [
            'Open your network in Cytoscape',
            'Use the NDEx integration to upload',
            'Follow prompts to publish your network',
          ],
          images: ['Cytoscape upload workflow'],
        },

        {
          title: 'Uploading Programmatically',
          content:
            'Advanced users can upload networks using the NDEx REST API with Java, Python, R, or JavaScript clients.',
          steps: [
            'Use NDEx REST API',
            'Choose a supported client library (Java, Python, R)',
            'Authenticate and upload networks via script',
          ],
        },

        {
          title: 'Uploading via Web Interface',
          content:
            'The NDEx web UI currently supports uploading networks in CX format.',
          steps: [
            'Click "Upload Networks" in My Account',
            'Select CX file(s)',
            'Click "Upload All"',
            'Wait for processing to complete',
            'Check status indicators (success, warning, or error)',
          ],
          images: [
            'Upload networks button',
            'Upload results status indicators',
          ],
        },

        {
          title: 'Sharing Networks Externally (Sharable URLs)',
          content:
            'You can share private networks using a secure sharable URL, similar to Google Docs or Dropbox.',
          steps: [
            'Open your network',
            'Click "More" → "Share"',
            'Enable Sharable URL',
            'Copy and distribute the link',
            'Share only with trusted users',
          ],
          images: [
            'Share menu option',
            'Enable sharable URL button',
            'Copy URL interface',
            'Shared network view',
          ],
          note: 'Anyone with the link can access the network.',
        },

        {
          title: 'Sharing within NDEx',
          content:
            'You can share networks directly with NDEx users or groups using permissions.',
          steps: [
            'Open network → click "More" → "Share"',
            'Search for users or groups',
            'Click "Add"',
            'Assign permission level (read, edit, admin)',
            'Click "Save Changes"',
          ],
          images: ['User/group sharing interface'],
        },

        {
          title: 'Requesting Access to a Network',
          content:
            'If you need higher permissions on a network, you can request access.',
          steps: [
            'Open the network',
            'Click "More" → "Upgrade permission"',
            'Add a message explaining your request',
            'Submit request',
            'Track status in Tasks & Notifications',
          ],
          images: ['Access request dialog', 'Tasks & notifications panel'],
        },

        {
          title: 'Granting Access to a Network',
          content:
            'As a network owner, you can approve or deny access requests from others.',
          steps: [
            'Go to "Tasks & Notifications"',
            'Review incoming requests',
            'Open request details',
            'Accept or decline',
            'Optionally add a message',
          ],
          images: ['Grant access dialog'],
          note:
            'Be cautious when granting edit access—users can modify your network.',
        },
      ]}
    />
  )
}