import FolderViewer from '../_components/FolderViewer'

/**
 * Generate static params for static export
 * For dynamic folder routes, we return a placeholder to satisfy Next.js static export requirements
 * All actual folder UUIDs are handled by client-side routing
 */
export async function generateStaticParams() {
  // For static export, we need to provide at least one static param
  // Since folder UUIDs are dynamic and unknown at build time,
  // we provide a placeholder that will be handled at runtime
  return [
    { uuid: 'placeholder' }
  ]
}

interface FolderPageProps {
  params: Promise<{
    uuid: string
  }>
}

/**
 * Public Folder Page
 * 
 * This page displays the contents of a public folder.
 * Key features:
 * - Public access (anonymous users can view)
 * - Read-only folder content viewing
 * - NOT part of the personal account system
 */
export default async function FolderPage({ params }: FolderPageProps) {
  const { uuid } = await params;
  
  console.log('Public FolderPage rendering with UUID:', uuid);
  
  // Pass the UUID directly to FolderViewer (it handles placeholder/undefined internally)
  return <FolderViewer uuid={uuid} />
}
