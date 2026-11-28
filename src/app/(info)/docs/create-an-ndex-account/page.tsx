'use client'

import DocTemplate from '../components/DocTemplate'
import createAccountButton from '@/images/login_button.png'
import loginModal from '@/images/login_modal.png'
import myAccount from '@/images/my_account.png'
import accountSettings from '@/images/account_settings.png'
import editProfile from '@/images/edit_profile.png'

export default function CreateAccountPage() {
  return (
    <DocTemplate
      title="Creating and Using an NDEx Account"
      description="Step-by-step guide to creating and managing your NDEx account"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content:
                'This guide walks you through how to create and use an NDEx account. Review it carefully to understand all features available to you.',
            },
          ],
        },
        {
          title: '1. Register an Account',
          blocks: [
            {
              type: 'text',
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
                  and click <strong>Login</strong> in the top-right corner.
                </>
              ),
            },
            {
              type: 'image',
              image: {
                src: createAccountButton,
                alt: 'Login/Register button in the top-right of the NDEx site',
                caption: 'The Login/Register button is in the top-right corner.',
              },
            },
            {
              type: 'text',
              content: 'Then choose how you want to sign up:',
            },
            {
              type: 'image',
              image: {
                src: loginModal,
                alt: 'NDEx login screen showing sign-in options and Register link',
              },
            },
            {
              type: 'steps',
              steps: [
                'Choose Sign in with Google and select your Google account (recommended)',
                'Or click "New user? Register" for manual signup — use a unique username and email, then verify your email',
                'Fill in all required fields and click Register',
              ],
            },
            {
              type: 'note',
              content: 'Using a Google account is faster and recommended.',
            },
          ],
        },
        {
          title: '2. My Account Page',
          blocks: [
            {
              type: 'steps',
              steps: [
                'View and manage your Networks, folders and shortcuts',
                'See files shared with you.',
                'Clear or restore recently trashed files',
              ],
            },
            {
              type: 'image',
              image: {
                src: myAccount,
                alt: 'My Account dashboard',
              },
            },
          ],
        },
        {
          title: '3. Account Settings',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Change notification settings and account details',
              ],
            },
            {
              type: 'image',
              image: {
                src: accountSettings,
                alt: 'Edit profile dialog',
              },
            },
          ],
        },
        {
          title: '4. Edit profile',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Change your personal profile details',
              ],
            },
            {
              type: 'image',
              image: {
                src: editProfile,
                alt: 'Groups tab view',
              },
            },
          ],
        },
      ]}
    />
  )
}