import { redirect } from 'next/navigation'

interface NetworksetPageProps {
  params: Promise<{
    uuid: string
  }>
}

/**
 * Legacy Networkset Route
 * 
 * Redirects /networkset/[uuid] to /folders/[uuid] for backward compatibility.
 * This ensures old links continue to work while using the new folder structure.
 */
export default async function NetworksetPage({ params }: NetworksetPageProps) {
  const { uuid } = await params
  
  // Redirect to the new folders route
  redirect(`/folders/${uuid}`)
}

/**
 * Generate static params for legacy networkset routes
 */
export async function generateStaticParams() {
  // Return placeholder for static export compatibility
  return [{ uuid: 'placeholder' }]
}
