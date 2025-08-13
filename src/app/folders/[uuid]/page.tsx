import MyAccount from '@/components/my-account/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'

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
 * Folder Page
 * This page displays the contents of a specific folder using the MyAccount component
 */
export default async function FolderPage({ params }: FolderPageProps) {
  const { uuid } = await params;
  
  // Debug logging to see if this component is actually rendering
  console.log('FolderPage rendering with UUID:', uuid);
  
  // Ensure we have a valid UUID (not the placeholder)
  const actualUuid = uuid === 'placeholder' ? undefined : uuid;
  
  console.log('Actual UUID being passed to MyAccount:', actualUuid);
  
  return (
    <MyAccount 
      tabState={MyAccountTabType.MYNETWORKS} 
      uuid={actualUuid}
    />
  )
}
