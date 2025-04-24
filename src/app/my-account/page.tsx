import MyAccount from '@/components/my-account/MyAccount'
import { MyAccountTabType } from '@/types/api/ui/myAccount'
/**
 * My Account Page
 * This page displays the user's content using the MyAccount component
 * with tabState='myAccount'
 */
export default function MyAccountPage() {
  return <MyAccount tabState={MyAccountTabType.MYNETWORKS} />
}
