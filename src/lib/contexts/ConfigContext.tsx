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

  useEffect(() => {
    // Try to load config.json as an asset directly
    // This treats config.json as a true asset that can be deployed anywhere
    const loadConfig = async () => {
      try {
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
        
        // If loading from basePath fails, try from root (for legacy deployments)
        if (!response.ok) {
          configUrl = '/config.json'
          response = await fetch(configUrl)
        }
        
        // If both fail and we have a current path, try to extract base path from URL
        if (!response.ok && typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const pathSegments = currentPath.split('/').filter(Boolean)
          if (pathSegments.length > 0) {
            // Try loading config from the first path segment (potential base path)
            configUrl = `/${pathSegments[0]}/config.json`
            response = await fetch(configUrl)
          }
        }
        
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
          // Store the base path for future use by withBasePath utility
          if (typeof window !== 'undefined' && data.urlBaseName) {
            (window as { __APP_BASE_PATH__?: string }).__APP_BASE_PATH__ = data.urlBaseName
          }
        } else {
          throw new Error(`Failed to load config from ${configUrl}`)
        }
      } catch (error) {
        console.error('Failed to load config:', error)
        // Fallback to a basic config if loading fails
        const fallbackConfig = {
          ndexBaseUrl: "dev1.ndexbio.org",
          keycloakConfig: {
            url: "https://dev1.ndexbio.org/auth2",
            clientId: "cytoscapendex",
            realm: "ndex"
          },
          urlBaseName: "/ndex3",
          uiContent: {
            contentRootPath: "https://home.ndexbio.org/landing_page_content/v2_4_2",
            featuredContent: "featured_content.json",
            featuredNetwork: "featured_networks.json",
            mainContent: "main.json",
            logos: "logos.json"
          }
        }
        setConfig(fallbackConfig)
        if (typeof window !== 'undefined') {
          (window as { __APP_BASE_PATH__?: string }).__APP_BASE_PATH__ = fallbackConfig.urlBaseName
        }
      }
    }
    
    loadConfig()
  }, [])

  if (!config) {
    return <div>Loading configuration...</div>
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
