'use client'

import React, {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
} from 'react'
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { EmailVerificationDialog } from '@/components/EmailVerificationDialog'
//import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from '../api/ndex-client-manager'

type AuthContextType = {
  keycloak: Keycloak | null
  isAuthenticated: boolean
  token: string
  tokenParsed?: KeycloakTokenParsed
  login: (fromHomePage?: boolean) => void
  logout: () => void
  isInitializing: boolean
  diskUsed: number
  diskQuota: number
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error('useAuth must be used within a KeycloakProvider')
  return context
}

export const KeycloakProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const config = useConfig()
  const keycloakRef = useRef<Keycloak | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState('')
  const [tokenParsed, setTokenParsed] = useState<
    KeycloakTokenParsed | undefined
  >(undefined)
  const [diskUsed, setDiskUsed] = useState(0)
  const [diskQuota, setDiskQuota] = useState(0)
  const [isInitializing, setIsInitializing] = useState(true)

  // State for email verification
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  /**
   * checkUserVerification will try an NDEx sign-in from ID token
   * If NDEx returns an "unverified" error, we set emailUnverified, userName, userEmail
   */
  const checkUserVerification = async (ndexBaseUrl: string, token: string) => {
    try {
      const ndexClient = getNdexClient(ndexBaseUrl)
      const userInfo = await ndexClient.signInFromIdToken(token)
      setDiskUsed(userInfo.diskUsed)
      setDiskQuota(userInfo.diskQuota)
      // If it succeeds, user is verified
      setEmailUnverified(false)
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'status' in e &&
        (e as { status: number }).status === 401 &&
        'response' in e &&
        typeof (e as { response?: unknown }).response === 'object' &&
        (e as { response?: { data?: { errorCode?: string; message?: string } } }).response?.data?.errorCode === 'NDEx_User_Account_Not_Verified'
      ) {
        // Extract name/email from NDEx's error message
        const pattern = /NDEx user account ([\w.]+) <([\w.]+@[\w.]+)>/
        const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message
        const match = typeof message === 'string' ? message.match(pattern) : null
        if (match) {
          setUserName(match[1])
          setUserEmail(match[2])
        }
        setEmailUnverified(true)
      } else {
        // some other error -- treat them as verified to avoid an infinite loop
        setEmailUnverified(false)
      }
    }
  }

  /**
   * "Already Verified" button in the modal
   * We just re-run the check. If it succeeds, the modal closes.
   */
  const handleVerify = async () => {
    if (!config || !token) return
    await checkUserVerification(config.ndexBaseUrl, token)
  }

  /**
   * "Log Out" button in the modal
   */
  const handleCancel = () => {
    keycloakRef.current?.logout()
  }

  useEffect(() => {
    if (!config || keycloakRef.current) return

    const kc = new Keycloak({
      url: config.keycloakConfig.url,
      realm: config.keycloakConfig.realm,
      clientId: config.keycloakConfig.clientId,
    })

    keycloakRef.current = kc

    // Manually construct the silent SSO URI with base path
    const baseName = config.urlBaseName || ''
    const silentCheckUri = window.location.origin + (baseName ? `/${baseName}` : '') + '/silent-check-sso.html'
    console.log('🔍 Keycloak silent SSO URI:', silentCheckUri)
    console.log('🔍 Config urlBaseName:', baseName)
    
    kc.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: silentCheckUri,
    })
      .then(async (authenticated) => {
        setIsAuthenticated(authenticated)
        if (authenticated && kc.token) {
          setToken(kc.token)
          setTokenParsed(kc.tokenParsed)
          // Check if user is verified
          await checkUserVerification(config.ndexBaseUrl, kc.token)
        }

        // Refresh token periodically
        if (authenticated) {
          setInterval(() => {
            kc.updateToken(60)
              .then((refreshed) => {
                if (refreshed && kc.token) {
                  setToken(kc.token)
                  setTokenParsed(kc.tokenParsed)
                }
              })
              .catch(() => kc.logout())
          }, 60000)
        }

        // Mark initialization as complete
        setIsInitializing(false)
      })
      .catch((err) => {
        console.error('Keycloak init failed', err)
        // Mark initialization as complete even on error
        setIsInitializing(false)
      })
  }, [config])

  // No complex redirect logic needed - Keycloak handles this with redirectUri

  return (
    <AuthContext.Provider
      value={{
        keycloak: keycloakRef.current,
        isAuthenticated,
        token,
        tokenParsed,
        login: (fromHomePage?: boolean) => {
          console.log('🚀 Login initiated, fromHomePage:', fromHomePage)
          
          if (fromHomePage) {
            // Use redirectUri to go directly to my-account after successful login
            // The redirectUri should match the full URL as seen by the browser
            const myAccountUri = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/my-account'
            console.log('🎯 Redirecting to my-account after login:', myAccountUri)
            console.log('🔍 Current location details:', { 
              origin: window.location.origin,
              pathname: window.location.pathname,
              href: window.location.href 
            })
            keycloakRef.current?.login({ redirectUri: myAccountUri })
          } else {
            // Normal login - stay on current page
            keycloakRef.current?.login()
          }
        },
        logout: () => keycloakRef.current?.logout(),
        isInitializing,
        diskUsed,
        diskQuota,
      }}
    >
      {/* Normal app children */}
      {children}

      {/* If the user is authenticated but email is unverified, show the modal */}
      {isAuthenticated && emailUnverified && (
        <EmailVerificationDialog
          onVerify={handleVerify}
          onCancel={handleCancel}
          userName={userName}
          userEmail={userEmail}
        />
      )}
    </AuthContext.Provider>
  )
}
