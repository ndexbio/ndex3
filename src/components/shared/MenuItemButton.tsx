'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface MenuItemButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  /** Tooltip explaining WHY the item is disabled (e.g. "Sign in to use this feature"). */
  disabledTooltip?: string
  /** Red styling for destructive actions. */
  danger?: boolean
  /** Replaces the icon with a spinner and disables the button. */
  busy?: boolean
  busyLabel?: string
}

/**
 * MenuItemButton
 *
 * One dropdown-menu row with unified enabled / disabled / destructive styling.
 * Disabled items stay visible (greyed out) so viewers can see what signing in
 * or gaining permission would unlock — per the folder-view UX spec, edit
 * actions are greyed for anonymous and read-only viewers, never hidden.
 */
export default function MenuItemButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  disabledTooltip,
  danger = false,
  busy = false,
  busyLabel,
}: MenuItemButtonProps) {
  const isDisabled = disabled || busy

  const textClass = isDisabled
    ? 'text-gray-400 cursor-not-allowed'
    : danger
    ? 'text-red-700 hover:bg-gray-100'
    : 'text-gray-700 hover:bg-gray-100'

  const iconClass = isDisabled
    ? 'text-gray-400'
    : danger
    ? 'text-red-500 group-hover:text-red-700'
    : 'text-gray-500 group-hover:text-gray-700'

  const button = (
    <button
      type="button"
      className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${textClass}`}
      onClick={isDisabled ? undefined : (e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      <Icon className={`h-4 w-4 ${busy ? 'animate-spin' : ''} ${iconClass}`} />
      {busy && busyLabel ? busyLabel : label}
    </button>
  )

  return disabled && disabledTooltip ? (
    <div title={disabledTooltip}>{button}</div>
  ) : (
    button
  )
}
