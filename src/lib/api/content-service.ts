import { FeaturedContentResponse, FeaturedNetworkResponse } from '@/types/ui/content';
import { AppConfig, MainContentItem, Logo } from '@/types/entities/AppConfig';

/**
 * Simplified Content Service
 * 
 * This service directly fetches content from URLs specified in the config.json uiContent object.
 * No proxy routes needed - just direct fetch calls to external URLs.
 */

/**
 * SWR fetcher function for JSON data
 */
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-cache' })

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }

  return response.json()
}

/**
 * SWR fetcher function for HTML/text data
 */
const textFetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-cache' })

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }

  return response.text()
}

/**
 * Fetches featured content data directly from the URL in config
 * 
 * @param config Application configuration containing direct URLs
 * @returns FeaturedContentResponse
 */
export const fetchFeaturedContent = async (config: AppConfig): Promise<FeaturedContentResponse> => {
  try {
    const url = config.uiContent.contentRootPath 
      ? `${config.uiContent.contentRootPath}/${config.uiContent.featuredContent}`
      : config.uiContent.featuredContent
    return await fetcher(url)
  } catch (error) {
    console.warn('Error fetching featured content:', error)
    // Return empty fallback data on error
    return { items: [] } as FeaturedContentResponse
  }
}

/**
 * Fetches the featured networks directly from the URL in config
 * 
 * @param config Application configuration containing direct URLs
 * @returns FeaturedNetworkResponse
 */
export const fetchFeaturedNetworks = async (config: AppConfig): Promise<FeaturedNetworkResponse> => {
  try {
    const url = config.uiContent.contentRootPath 
      ? `${config.uiContent.contentRootPath}/${config.uiContent.featuredNetwork}`
      : config.uiContent.featuredNetwork
    return await fetcher(url)
  } catch (error) {
    console.warn('Error fetching featured networks:', error)
    // Return empty fallback data on error
    return { items: [] } as FeaturedNetworkResponse
  }
}

/**
 * Fetches blog content from main content file
 * 
 * @param config Application configuration containing direct URLs
 * @returns Promise containing an array of HTML content strings
 */
export const fetchBlogContent = async (config: AppConfig): Promise<string[]> => {
  try {
    // Check if mainContent is available in the new config structure
    if (config.uiContent.mainContent) {
      const mainContentUrl = config.uiContent.contentRootPath 
        ? `${config.uiContent.contentRootPath}/${config.uiContent.mainContent}`
        : config.uiContent.mainContent
      
      const mainContentData = await fetcher(mainContentUrl)
      
      // Extract HTML file paths from mainContent structure
      if (mainContentData && mainContentData.mainContent && Array.isArray(mainContentData.mainContent)) {
        const htmlResponses = await Promise.all(
          mainContentData.mainContent.map(async (item: MainContentItem) => {
            try {
              if (item.content) {
                const htmlUrl = config.uiContent.contentRootPath 
                  ? `${config.uiContent.contentRootPath}/${item.content}`
                  : item.content
                return await textFetcher(htmlUrl)
              }
              return `<div>No content specified</div>`
            } catch (error) {
              console.warn(`Error fetching HTML content from ${item.content}:`, error)
              return `<div>Content unavailable from ${item.content}</div>`
            }
          })
        )
        return htmlResponses
      }
      
      // If mainContent doesn't have the expected structure, return empty
      console.warn('Main content does not have expected structure:', mainContentData)
      return []
    }
    
    // Fallback: check if blog array exists (old config structure)
    if (config.uiContent.blog && Array.isArray(config.uiContent.blog)) {
      const responses = await Promise.all(
        config.uiContent.blog.map(async (url) => {
          try {
            return await textFetcher(url)
          } catch (error) {
            console.warn(`Error fetching blog content from ${url}:`, error)
            return `<div>Content unavailable from ${url}</div>`
          }
        })
      )
      return responses
    }
    
    // Return empty array if no blog content is configured
    return []
  } catch (error) {
    console.error('Error fetching blog content:', error)
    return []
  }
}

/**
 * Fetches logo data from logos file or returns from config
 * 
 * @param config Application configuration containing logo data
 * @returns Array of logo objects with image, title, and href properties
 */
export const fetchLogos = async (config: AppConfig): Promise<Logo[]> => {
  try {
    // Check if logos is a filename (new config structure)
    if (config.uiContent.logos && typeof config.uiContent.logos === 'string') {
      const url = config.uiContent.contentRootPath 
        ? `${config.uiContent.contentRootPath}/${config.uiContent.logos}`
        : config.uiContent.logos
      
      const logoData = await fetcher(url)
      
      // Handle the new logos.json structure with nested logos array
      if (logoData && logoData.logos && Array.isArray(logoData.logos)) {
        return logoData.logos.map((logo: Logo) => ({
          image: logo.image,
          title: logo.title || 'Logo',
          href: logo.href || '#'
        }))
      }
      
      // Handle direct array structure (fallback)
      if (Array.isArray(logoData)) {
        return logoData
      }
      
      return []
    }
    
    // Fallback: check if logo array exists directly in config (old structure)
    if (config.uiContent.logo && Array.isArray(config.uiContent.logo)) {
      // Convert old format {src, alt} to new format {image, title, href}
      return config.uiContent.logo.map(logo => ({
        image: logo.src,
        title: logo.alt,
        href: '#'
      }))
    }
    
    // Return empty array if no logos are configured
    return []
  } catch (error) {
    console.warn('Error fetching logos:', error)
    return []
  }
}
