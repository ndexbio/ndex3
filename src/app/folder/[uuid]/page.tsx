import MyAccount from '@/components/my-account/MyAccount'

/**
 * Generate static params for static export
 * Returns empty array as this route is dynamic and should be generated at runtime
 */
export function generateStaticParams() {
  return []
}

/**
 * Folder View Page
 */
export default function FolderPage({ params }: { params: { uuid: string } }) {
  return <MyAccount uuid={params.uuid} />
}
