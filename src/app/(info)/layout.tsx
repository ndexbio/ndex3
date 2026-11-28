'use client'

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-4xl px-6 py-10">
        {children}
      </div>
    </div>
  )
}