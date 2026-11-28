'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseResizablePanelOptions {
  defaultWidth?: number
  minWidth?: number
  maxWidthPercent?: number
  storageKey?: string
}

interface UseResizablePanelReturn {
  width: number
  setWidth: (width: number) => void
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useResizablePanel({
  defaultWidth = 320,
  minWidth = 280,
  maxWidthPercent = 0.6,
  storageKey = 'detailsPanel.defaultWidth'
}: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  const [width, setWidthState] = useState<number>(defaultWidth)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Load width from localStorage on mount
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem(storageKey)
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10)
        if (!isNaN(parsedWidth)) {
          // Apply constraints
          const maxWidth = Math.floor(window.innerWidth * maxWidthPercent)
          const constrainedWidth = Math.max(minWidth, Math.min(parsedWidth, maxWidth))
          setWidthState(constrainedWidth)
        }
      }
    } catch (error) {
      console.warn('Failed to load panel width from localStorage:', error)
    }
  }, [storageKey, minWidth, maxWidthPercent])

  // Update localStorage when width changes
  const setWidth = useCallback((newWidth: number) => {
    const maxWidth = Math.floor(window.innerWidth * maxWidthPercent)
    const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth))

    setWidthState(constrainedWidth)

    try {
      localStorage.setItem(storageKey, constrainedWidth.toString())
    } catch (error) {
      console.warn('Failed to save panel width to localStorage:', error)
    }
  }, [minWidth, maxWidthPercent, storageKey])

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX
      const newWidth = startWidth + deltaX
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      // Reset cursor style
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // Set dragging cursor and prevent text selection
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, setWidth])

  // Handle window resize to adjust max width
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = Math.floor(window.innerWidth * maxWidthPercent)
      if (width > maxWidth) {
        setWidth(maxWidth)
      }
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [width, maxWidthPercent, setWidth])

  return {
    width,
    setWidth,
    isDragging,
    handleMouseDown
  }
}