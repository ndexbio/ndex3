import DocTemplate from '../components/DocTemplate'

export default function CreateAccountPage() {
  return (
    <DocTemplate
      title="Creating and Using an NDEx Account"
      description="Step-by-step guide to creating and managing your NDEx account"
      lastUpdated="December 14, 2018"
      sections={[
        {
          title: 'Overview',
          content:
            'This guide walks you through how to create and use an NDEx account. Review it carefully to understand all features available to you.',
        },
        {
          title: '1. Register an Account',
          content: (
            <>
              Go to the{' '}
              <a
                href="https://www.ndexbio.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                NDEx website
              </a>{' '}
              and click <strong>Login/Register</strong>.
            </>
          ),
          steps: [
            'Click Login/Register in the top-right',
            'Choose Sign in with Google (recommended)',
            'Or use manual signup',
            'Select your Google account',
            'Accept terms and click Sign Up',
          ],
          images: [
            'NDEx landing page login button',
            'Google account selection dialog',
            'Sign up confirmation screen',
          ],
          note: 'Using a Google account is faster and recommended.',
        },
        {
          title: 'Manual Signup',
          steps: [
            'Click the manual signup link',
            'Fill in all required fields',
            'Use a unique username and email',
            'Accept Terms & Conditions',
            'Verify your email',
          ],
          images: ['Manual signup form'],
        },
        {
          title: '2. My Account Page',
          steps: [
            'View your Networks',
            'Access Groups',
            'Check Tasks & Notifications',
          ],
          images: ['My Account dashboard'],
        },
        {
          title: '3. Edit Profile',
          steps: [
            'Open Edit Account',
            'Select Edit Personal Info',
            'Update your details',
            'Submit changes',
          ],
          images: ['Edit profile dialog'],
          note: 'Using Gmail enables Google sign-in later.',
        },
        {
          title: '4. Groups',
          steps: [
            'Open My Groups tab',
            'View your groups',
            'Filter by name or role',
          ],
          images: ['Groups tab view'],
        },
        {
          title: '5. Tasks & Notifications',
          steps: [
            'View requests and tasks',
            'Approve or reject requests',
            'Delete tasks',
            'Refresh panels',
          ],
          images: ['Tasks and notifications panel'],
          note: 'Requests only appear if you manage a network or group.',
        },
      ]}
    />
  )
}