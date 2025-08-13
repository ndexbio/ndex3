'use client'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { AppConfig } from '@/types/entities/AppConfig'
import { BASE_PATH } from '../../../next.config'

interface ConfigProviderProps {
  children: ReactNode
}
// Create a context for the configuration
const ConfigContext = createContext<AppConfig | null>(null)

// Provider component that fetches the config
export const ConfigProvider = ({ children }: ConfigProviderProps) => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Try to load config.json as an asset directly
    // This treats config.json as a true asset that can be deployed anywhere
    const loadConfig = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Use the BASE_PATH from Next.js config as the primary source
        let basePath = BASE_PATH || ''
        
        // Fallback to runtime basePath if BASE_PATH is not available
        if (!basePath && typeof window !== 'undefined') {
          const nextData = (window as { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__
          basePath = nextData?.basePath || ''
        }
        
        // Try loading config from the basePath first (for apps with basePath configured)
        let configUrl = `${basePath}/config.json`
        let response = await fetch(configUrl)
        let lastAttemptedUrl = configUrl
        
        // If loading from basePath fails, try from root (for legacy deployments)
        if (!response.ok) {
          configUrl = '/config.json'
          response = await fetch(configUrl)
          lastAttemptedUrl = configUrl
        }
        
        // If both fail and we have a current path, try to extract base path from URL
        if (!response.ok && typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const pathSegments = currentPath.split('/').filter(Boolean)
          if (pathSegments.length > 0) {
            // Try loading config from the first path segment (potential base path)
            configUrl = `/${pathSegments[0]}/config.json`
            response = await fetch(configUrl)
            lastAttemptedUrl = configUrl
          }
        }
        
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
          setIsLoading(false)
        } else {
          throw new Error(`Failed to load configuration file. HTTP ${response.status}: ${response.statusText}. Last attempted URL: ${lastAttemptedUrl}`)
        }
      } catch (error) {
        console.error('Configuration loading error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while loading configuration'
        setError(`Configuration Error: ${errorMessage}`)
        setIsLoading(false)
      }
    }
    
    loadConfig()
  }, [])

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Loading configuration...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#d32f2f', margin: '0 0 16px 0' }}>Configuration Error</h2>
          <p style={{ color: '#666', margin: '0 0 16px 0' }}>
            The application configuration could not be loaded. This typically indicates a deployment issue.
          </p>
          <p style={{ 
            fontFamily: 'monospace', 
            backgroundColor: '#f8f8f8', 
            padding: '12px', 
            borderRadius: '4px',
            color: '#d32f2f',
            fontSize: '14px',
            wordBreak: 'break-word'
          }}>
            {error}
          </p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>
            Please ensure that the <code>config.json</code> file is properly deployed and accessible.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  )
}

// Custom hook to access config values
export const useConfig = () => {
  const config = useContext(ConfigContext)
  if (!config) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return config
}

// Custom hook to get the base path from config
export const useBasePath = () => {
  const config = useConfig()
  return config.urlBaseName || ''
}
