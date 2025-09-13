import UserPublicPage from '../_components/UserPublicPage'
import type { Metadata } from 'next'

// Generate static params for build-time generation
export async function generateStaticParams() {
  // Return a placeholder that will trigger client-side routing for actual UUIDs
  return [{ uuid: 'placeholder' }]
}

// Generate metadata for the page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ uuid: string }>
}): Promise<Metadata> {
  const { uuid } = await params
  
  if (uuid === 'placeholder') {
    return {
      title: 'User Profile - NDEx3',
      description: 'View user profile and public content on NDEx3'
    }
  }

  // For actual UUIDs, we would need to fetch user data here for SEO
  // But since we're using static export, we'll handle this client-side
  return {
    title: 'User Profile - NDEx3',
    description: 'View user profile and public content on NDEx3'
  }
}

export default async function UserPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params
  
  // If it's the placeholder, don't render anything (client-side routing will handle it)
  if (uuid === 'placeholder') {
    return null
  }

  return <UserPublicPage uuid={uuid} />
}