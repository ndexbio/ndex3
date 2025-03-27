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

export interface AppConfig {
  ndexBaseUrl: string
  uiContent: UIContent
}
