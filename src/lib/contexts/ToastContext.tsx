'use client'

import React, { createContext, useContext, useState } from 'react'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/Toast'

type ToastType = {
  id: string
  title?: string
  description: string
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

type ToastContextType = {
  toasts: ToastType[]
  addToast: (toast: Omit<ToastType, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const addToast = (toast: Omit<ToastType, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, ...toast }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <ToastProvider swipeDirection="right">
        {children}

        {toasts.map(({ id, title, description, type, duration }) => (
          <Toast
            key={id}
            duration={duration || 5000}
            className={`${
              type === 'success'
                ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200'
                : type === 'error'
                ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200'
                : type === 'warning'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200'
                : type === 'info'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200'
                : ''
            }`}
            onOpenChange={(open: boolean) => {
              if (!open) removeToast(id)
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              <ToastDescription>{description}</ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        ))}

        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastContextProvider')
  }
  return context
}
