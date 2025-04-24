'use client'

import React from 'react'
import MyAccount from '@/components/my-account/MyAccount'
import { MyAccountTabType } from '@/types/api/ui/myAccount'
/**
 * Shared With Me Page
 * This page displays items that have been shared with the current user
 * using the same MyAccount component with tabState='shared'
 */
export default function SharedWithMePage() {
  return <MyAccount tabState={MyAccountTabType.SHARED} />
}
