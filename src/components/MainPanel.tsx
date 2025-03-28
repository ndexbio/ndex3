'use client'

interface MainPanelProps {
  children: React.ReactNode
}

export function MainPanel({ children }: MainPanelProps) {
  return <main className="w-full">{children}</main>
}
