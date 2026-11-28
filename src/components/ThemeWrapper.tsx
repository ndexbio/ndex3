'use client'

import { ThemeProvider } from './theme-provider'

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme={false}
      storageKey="ui-theme"
    >
      {children}
    </ThemeProvider>
  )
}
