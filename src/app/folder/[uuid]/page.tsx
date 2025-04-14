import MyAccount from '@/components/myAccount/MyAccount'

type Props = {
  params: {
    uuid: string
  }
}

/**
 * Folder View Page
 */
export default function FolderPage({ params }: Props) {
  return <MyAccount uuid={params.uuid} />
}
