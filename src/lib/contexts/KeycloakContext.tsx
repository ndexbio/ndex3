'use client'

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react'
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { EmailVerificationDialog } from '@/components/EmailVerificationDialog'
import { SignInErrorDialog } from '@/components/SignInErrorDialog'
import { getNdexClient } from '../api/ndex-client-manager'
import { NDExUser, NDExAuthError } from '@js4cytoscape/ndex-client'

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
  user: NDExUser | null
  refreshUser: () => Promise<void>
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
  const [user, setUser] = useState<NDExUser | null>(null)

  // State for email verification
  const [emailUnverified, setEmailUnverified] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // State for sign-in errors (non-unverified failures)
  const [signInError, setSignInError] = useState<string | null>(null)

  /**
   * Attempt NDEx sign-in with the given ID token.
   *
   * Returns:
   *   'verified'   – sign-in succeeded; caller should expose auth state to children
   *   'unverified' – account exists but email is not yet verified; dialog is shown
   *   'failed'     – sign-in failed for any other reason; treat user as anonymous
   */
  const checkUserVerification = async (
    ndexBaseUrl: string,
    token: string
  ): Promise<'verified' | 'unverified' | 'failed'> => {
    try {
      const ndexClient = getNdexClient(ndexBaseUrl, token)
      const userInfo = await ndexClient.user.authenticate()
      setUser(userInfo)
      setDiskUsed((userInfo as any).diskUsed || 0)
      setDiskQuota((userInfo as any).diskQuota || 0)
      setEmailUnverified(false)
      return 'verified'
    } catch (e: unknown) {
      if (e instanceof NDExAuthError && e.errorCode === 'NDEx_User_Account_Not_Verified') {
        // Get user info from Keycloak's /userinfo endpoint, not from the error message
        try {
          const kcUserInfo = await keycloakRef.current?.loadUserInfo() as
            | { preferred_username?: string; email?: string }
            | undefined
          setUserName(kcUserInfo?.preferred_username ?? '')
          setUserEmail(kcUserInfo?.email ?? '')
        } catch {
          setUserName('')
          setUserEmail('')
        }
        setEmailUnverified(true)
        return 'unverified'
      } else {
        // Any other error: do not expose auth state — show error dialog, then anonymous
        setEmailUnverified(false)
        const message = e instanceof Error ? e.message : 'An unexpected error occurred during sign-in.'
        setSignInError(message)
        return 'failed'
      }
    }
  }

  /**
   * Re-fetch the current user from the server and update local state.
   * Call this after updating the user's profile.
   */
  const refreshUser = useCallback(async () => {
    if (!config || !token || !user?.externalId) return
    try {
      const ndexClient = getNdexClient(config.ndexBaseUrl, token)
      const updatedUser = await ndexClient.user.getUser(user.externalId)
      setUser(updatedUser)
      setDiskUsed((updatedUser as any).diskUsed || 0)
      setDiskQuota((updatedUser as any).diskQuota || 0)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [config, token, user?.externalId])

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
        if (authenticated && kc.token) {
          // Resolve sign-in BEFORE exposing auth state to children.
          // While this call is in-flight, children see isAuthenticated=false
          // and no token, so they cannot fire authenticated API requests.
          const result = await checkUserVerification(config.ndexBaseUrl, kc.token)

          if (result === 'verified' || result === 'unverified') {
            // 'verified'   → children render normally as authenticated user
            // 'unverified' → dialog blocks children; token kept for the retry call
            setIsAuthenticated(true)
            setToken(kc.token)
            setTokenParsed(kc.tokenParsed)

            // Keep token fresh (needed for both normal use and the verify retry)
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
          // 'failed' → leave isAuthenticated=false, token=''; app runs as anonymous
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
        logout: () => {
          setUser(null)
          return keycloakRef.current?.logout()
        },
        isInitializing,
        diskUsed,
        diskQuota,
        user,
        refreshUser,
      }}
    >
      {isAuthenticated && emailUnverified ? (
        /* Block the app when email is unverified */
        <EmailVerificationDialog
          onVerify={handleVerify}
          onCancel={handleCancel}
          userName={userName}
          userEmail={userEmail}
        />
      ) : signInError ? (
        /* Block the app when sign-in failed — dismiss logs out and returns to anonymous home */
        <SignInErrorDialog
          errorMessage={signInError}
          onDismiss={() => {
            setSignInError(null)
            keycloakRef.current?.logout()
          }}
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}