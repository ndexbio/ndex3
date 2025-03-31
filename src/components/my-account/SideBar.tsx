'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

import {
  Folder,
  Users,
  Trash,
  Plus,
  File,
  Home,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface SideBarProps {
  storageUsed: number
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function SideBar({
  storageUsed,
  collapsed,
  setCollapsed,
}: SideBarProps) {
  const [showNewOptions, setShowNewOptions] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleNewOptions = () => {
    setShowNewOptions(!showNewOptions)
  }

  // Handle clicks outside of the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the dropdown is open and the click is outside both the dropdown and the button
      if (
        showNewOptions &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowNewOptions(false)
      }
    }

    // Add event listener when the dropdown is open
    if (showNewOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    // Cleanup the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNewOptions])

  const storageTotal = 5
  const storagePercentage = (storageUsed / storageTotal) * 100

  return (
    <nav
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } h-screen bg-white border-r border-gray-200 p-4 flex flex-col transition-all duration-300 relative`}
    >
      <div className="absolute -right-3 top-15 z-10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-full bg-white p-1 border border-gray-200 shadow-sm"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* New Button */}
      <div
        className={`mb-6 relative ${collapsed ? 'flex justify-center' : ''}`}
      >
        <button
          ref={buttonRef}
          onClick={toggleNewOptions}
          className={`flex items-center gap-2 py-2 ${
            collapsed ? 'px-3' : 'px-6'
          } bg-gray-100 rounded-full shadow-sm hover:bg-gray-200 transition-colors`}
        >
          <Plus className="h-5 w-5" />
          {!collapsed && <span className="font-medium">New</span>}
        </button>

        {showNewOptions && (
          <div
            ref={dropdownRef}
            className={`absolute ${
              collapsed ? 'left-16' : 'left-0'
            } mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200`}
          >
            <div className="py-1">
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={() => {
                  // Handle new file action
                  setShowNewOptions(false)
                }}
              >
                <File className="h-4 w-4" />
                New file
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                onClick={() => {
                  // Handle new folder action
                  setShowNewOptions(false)
                }}
              >
                <Folder className="h-4 w-4" />
                New folder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <ul className="space-y-1">
        <li>
          <Link
            href="/"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md hover:bg-gray-100 text-gray-700`}
          >
            <Home className="h-5 w-5" />
            {!collapsed && <span>Home</span>}
          </Link>
        </li>
        <li>
          <div
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md bg-blue-50 text-blue-600`}
          >
            <Folder className="h-5 w-5" />
            {!collapsed && (
              <>
                <span>My Networks</span>
              </>
            )}
          </div>
        </li>

        <li>
          <Link
            href="/shared-with-me"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md hover:bg-gray-100 text-gray-700`}
          >
            <Users className="h-5 w-5" />
            {!collapsed && <span>Shared with me</span>}
          </Link>
        </li>
        <li>
          <Link
            href="/trash"
            className={`flex items-center ${
              collapsed ? 'justify-center' : 'gap-3'
            } p-2 rounded-md hover:bg-gray-100 text-gray-700`}
          >
            <Trash className="h-5 w-5" />
            {!collapsed && <span>Trash</span>}
          </Link>
        </li>
      </ul>

      {/* Storage indicator */}
      {!collapsed && (
        <div className="mt-auto pt-4">
          <div className="flex items-center text-sm text-gray-700 mb-1">
            <span>Storage ({storagePercentage.toFixed(0)}% full)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {storageUsed.toFixed(2)} GB of {storageTotal} GB used
          </div>
        </div>
      )}

      {collapsed && (
        <div className="mt-auto flex justify-center">
          <div className="rounded-full bg-blue-500 p-2">
            <span className="text-xs text-white font-bold">
              {storagePercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </nav>
  )
}
