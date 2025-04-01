'use client'

interface MainPanelProps {
  children: React.ReactNode
}

export function MainPanel({ children }: MainPanelProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <main className="flex-grow w-full p-2">{children}</main>
    </SidebarProvider>
  )
}
