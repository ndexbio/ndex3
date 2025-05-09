import { FeaturedContentResponse, FeaturedNetworkResponse } from '@/types/ui/content';
import { AppConfig } from '@/types/entities/AppConfig';

/**
 * SWR fetcher function
 */
const fetcher = async (url: string) => {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetches featured content data
 * @param config Application configuration containing endpoints
 * @returns FeaturedContentResponse
 */
export const fetchFeaturedContent = async (config: AppConfig): Promise<FeaturedContentResponse> => {
  return fetcher(config.uiContent.featuredContent)
}

/**
 * Fetches the featured networks from NDEx
 * @param config Application configuration containing endpoints
 * @returns FeaturedNetworkResponse
 */
export const fetchFeaturedNetworks = async (config: AppConfig): Promise<FeaturedNetworkResponse> => {
  return fetcher(config.uiContent.featuredNetwork)
}

/**
 * Fetches blog content from multiple sources
 * @param config Application configuration containing endpoints
 * @returns Promise containing an array of HTML content
 */
export const fetchBlogContent = async (config: AppConfig): Promise<string[]> => {
  try {
    const responses = await Promise.all(
      config.uiContent.blog.map(async (url) => {
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Failed to fetch blog content: ${response.statusText}`)
        }

        return response.text() // Return raw HTML as text
      })
    )

    return responses
  } catch (error) {
    console.error('Error fetching blog content:', error)
    throw error
  }
}
