import type { Metadata } from 'next'
import './globals.css'
import { ThemeWrapper } from '@/components/ThemeWrapper'
import { ConfigProvider } from '@/lib/contexts/ConfigContext'
import { KeycloakProvider } from '@/lib/contexts/KeycloakContext'
import { NavBar } from '@/components/NavBar'
import { MainPanel } from '@/components/MainPanel'
import { Footer } from '@/components/Footer'
import { ToastContextProvider } from '@/lib/contexts/ToastContext'
import { BASE_PATH } from '../../next.config'
import { GoogleAnalytics } from '@next/third-parties/google'

export const metadata: Metadata = {
  title: 'NDEx 3',
  description: 'Next-generation NDEx Web Client',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
}
const gaId = process.env.NEXT_PUBLIC_GA_ID
function DynamicFavicon() {
  const faviconPath = `${BASE_PATH || ''}/ndex-logo.svg`
  return <link rel="icon" type="image/svg+xml" href={faviconPath} />
}

/**
 * This is the base layout of the page for all pages
 *
 * It has the basic components inclusing:
 * - NavBar
 * - MainPanel (container for the main content with Footer inside)
 * - ThemeWrapper (for theming)
 * - ConfigProvider (for configuration provided by the JSON file)
 * - DynamicFavicon (for dynamic favicon generated from the logo)
 * - Metadata (for SEO)
 * - Global styles
 * - ToastContextProvider (for showing notifications)
 *
 * @param children
 * @returns
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <DynamicFavicon />
      </head>
      <body className={`antialiased min-h-screen bg-background text-foreground`}>
        <ConfigProvider>
          <KeycloakProvider>
            <ToastContextProvider>
              <ThemeWrapper>
                <div className="min-h-screen">
                  <NavBar />
                  <MainPanel>
                    {children}
                    <Footer />
                  </MainPanel>
                </div>
              </ThemeWrapper>
            </ToastContextProvider>
          </KeycloakProvider>
        </ConfigProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}

      </body>
    </html>
  )
}