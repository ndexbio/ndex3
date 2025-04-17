import MyAccount from '@/components/myAccount/MyAccount'
/**
 * Folder View Page
 */
export default function FolderPage({ params }: { params: { uuid: string } }) {
  return <MyAccount uuid={params.uuid} />
}
