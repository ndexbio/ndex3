// app/docs/layout.tsx
import DocsSidebar from './components/DocsSidebar'

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r">
        <div className="sticky top-0 h-screen overflow-y-auto px-4 py-6">
          <DocsSidebar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-3xl px-6 lg:px-12 pt-6 pb-12">
          {children}
        </div>
      </main>
    </div>
  )
}