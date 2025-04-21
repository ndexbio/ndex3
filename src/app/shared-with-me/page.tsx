'use client'

import React from 'react'
import MyAccount from '@/components/my-account/MyAccount'

/**
 * Shared With Me Page
 * This page displays items that have been shared with the current user
 * using the same MyAccount component with isShared flag
 */
export default function SharedWithMePage() {
  return <MyAccount isShared={true} />
}
