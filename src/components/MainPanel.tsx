'use client'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './top-page/AppSidebar'

interface MainPanelProps {
  children: React.ReactNode
}

export function MainPanel({ children }: MainPanelProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <main className="w-full h-[calc(100vh-56px)]">{children}</main>
    </SidebarProvider>
  )
}
