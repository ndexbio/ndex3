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
// @ts-expect-error-next-line
import { NDEx } from '@js4cytoscape/ndex-client'
import { getNdexClient } from '../api/ndex-client-manager'

type AuthContextType = {
  keycloak: Keycloak | null
  isAuthenticated: boolean
  token: string
  tokenParsed?: KeycloakTokenParsed
  login: () => void
  logout: () => void
  isInitializing: boolean
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
      await ndexClient.signInFromIdToken(token)
      // If it succeeds, user is verified
      setEmailUnverified(false)
    } catch (e: any) {
      if (
        e.status === 401 &&
        e.response?.data?.errorCode === 'NDEx_User_Account_Not_Verified'
      ) {
        // Extract name/email from NDEx's error message
        const pattern = /NDEx user account ([\w.]+) <([\w.]+@[\w.]+)>/
        const match = e.response?.data?.message?.match(pattern)
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

    kc.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      silentCheckSsoRedirectUri:
        window.location.origin + config.urlBaseName + 'silent-check-sso.html',
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

  return (
    <AuthContext.Provider
      value={{
        keycloak: keycloakRef.current,
        isAuthenticated,
        token,
        tokenParsed,
        login: () => keycloakRef.current?.login(),
        logout: () => keycloakRef.current?.logout(),
        isInitializing,
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
