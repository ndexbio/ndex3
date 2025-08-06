/**
 * Logo configuration for the LogoCarousel component
 * Each logo represents a partner or affiliated organization
 */
interface Logo {
  /** 
   * Path to the logo image file relative to contentRootPath
   * Example: "logos/ucsd_logo_alt.png"
   */
  image: string
  /** 
   * Tooltip text displayed when hovering over the logo
   * Example: "University of California, San Diego"
   */
  title: string
  /** 
   * URL that the logo should link to when clicked
   * Example: "http://ucsd.edu/"
   */
  href: string
}

/**
 * Main content item configuration for blog/news content
 * Used to display HTML content in the home page content boxes
 */
interface MainContentItem {
  /** 
   * HTML filename to be rendered in the content box
   * File should be located under contentRootPath
   * Example: "doc4rudi.html"
   * Note: The 'title' attribute is deprecated and no longer used
   */
  content: string
}

/**
 * Main content configuration structure
 * Contains an array of content items to be displayed on the home page
 */
interface MainContent {
  /** Array of main content items */
  mainContent: MainContentItem[]
}

/**
 * Logo configuration for the LogoCarousel component
 * Each logo represents a partner or affiliated organization
 */
interface LogoConfig {
  /** 
   * Direct URL to the logo image
   * Example: "https://home.ndexbio.org/landing_page_content/v2_4_2/logos/ucsd_logo_alt.png"
   */
  src: string
  /** 
   * Alt text for the logo image
   * Example: "UCSD"
   */
  alt: string
}

/**
 * UI Content configuration structure
 * Supports both new (with contentRootPath) and legacy (direct URLs) configurations
 */
interface UIContent {
  /** 
   * Base path for all content files (new config structure)
   * Example: "https://home.ndexbio.org/landing_page_content/v2_4_2"
   */
  contentRootPath?: string
  
  /** 
   * Featured content configuration file path or direct URL
   * New: "featured_content.json" (combined with contentRootPath)
   * Legacy: "https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json"
   */
  featuredContent: string
  
  /** 
   * Featured networks configuration file path or direct URL
   * New: "featured_networks.json" (combined with contentRootPath)
   * Legacy: "https://home.ndexbio.org/landing_page_content/v2_4_2/featured_networks.json"
   */
  featuredNetwork: string
  
  /** 
   * Main content configuration file path (new config structure)
   * Example: "main.json"
   */
  mainContent?: string
  
  /** 
   * Logos configuration file path or array of logo configs
   * New: "logos.json" (combined with contentRootPath)
   * Legacy: [{"src": "https://...", "alt": "Logo Name"}]
   */
  logos?: string
  
  /** 
   * Array of direct URLs to blog/news HTML files (legacy structure)
   * Example: ["https://home.ndexbio.org/landing_page_content/v2_4_2/doc4rudi.html"]
   */
  blog?: string[]
  
  /** 
   * Array of logo configurations with direct URLs (legacy structure)
   * Example: [{"src": "https://...", "alt": "Logo Name"}]
   */
  logo?: LogoConfig[]
}

/**
 * Keycloak authentication configuration
 */
interface KeyCloakConfig {
  /** Keycloak realm name */
  realm: string
  /** Keycloak client ID */
  clientId: string
  /** Keycloak server URL */
  url: string
}

/**
 * Main application configuration interface
 * Defines all configuration needed for the NDEx application
 */
export interface AppConfig {
  /** Base URL for NDEx API endpoints */
  ndexBaseUrl: string
  /** UI content configuration for home page */
  uiContent: UIContent
  /** Keycloak authentication configuration */
  keycloakConfig: KeyCloakConfig
  /** Base name for application URLs (optional, defaults to root "/") */
  urlBaseName?: string
}

/**
 * Type exports for external configuration file structures
 */
export type { Logo, MainContent, MainContentItem }
