interface Logo {
  src: string
  alt: string
}

interface UIContent {
  featuredContent: string
  featuredNetwork: string
  blog: string[]
  logo: Logo[]
}

interface KeyCloakConfig {
  realm: string
  clientId: string
  url: string
}
export interface AppConfig {
  ndexBaseUrl: string
  uiContent: UIContent
  keycloakConfig: KeyCloakConfig
  urlBaseName: string
}
