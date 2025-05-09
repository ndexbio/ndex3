'use client'

import React from 'react'
import MyAccount from '@/components/my-account/MyAccount'
import { MyAccountTabType } from '@/types/ui/myAccount'
/**
 * Trash Page
 * This page displays items that have been moved to trash
 * using the same MyAccount component with tabState='trash'
 */
export default function TrashPage() {
  return <MyAccount tabState={MyAccountTabType.TRASH} />
}
