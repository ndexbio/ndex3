'use client'

import React from 'react'
import MyAccount from '@/components/my-account/MyAccount'

/**
 * Trash Page
 * This page displays items that have been moved to trash
 * using the same MyAccount component with isTrash flag
 */
export default function TrashPage() {
  return <MyAccount isTrash={true} />
}
