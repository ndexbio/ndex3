'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TriangleAlert, XCircle } from 'lucide-react'

interface NetworkStatusDialogProps {
  isOpen: boolean
  onClose: () => void
  type: 'warning' | 'error'
  title: string
  content: string[]
}

export const NetworkStatusDialog: React.FC<NetworkStatusDialogProps> = ({
  isOpen,
  onClose,
  type,
  title,
  content
}) => {
  const Icon = type === 'warning' ? TriangleAlert : XCircle
  const iconColor = type === 'warning' ? 'text-yellow-500' : 'text-red-500'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {title}
          </DialogTitle>
          <DialogDescription>
            {type === 'warning' ? 'This network has data validation warnings:' : 'This network has a data validation error:'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {content.map((item, index) => (
            <div key={index} className="text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NetworkStatusDialog