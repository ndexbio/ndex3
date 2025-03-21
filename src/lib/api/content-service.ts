import { FeaturedContentResponse, FeaturedNetworkResponse } from '@/types/api/ui/content';

const FEATURED_CONTENT_ENDPOINT = 'https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json'
const FEATURED_NETWORK_ENDPOINT = 'https://home.ndexbio.org/landing_page_content/v2_4_2/featured_networks.json'
const BLOG_ENDPOINT = [
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc4rudi.html',
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc7rudi.html',
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc5rudi.html',
]

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
 * @returns FeaturedContentResponse
 */
export const fetchFeaturedContent = async (): Promise<FeaturedContentResponse> => {
  return fetcher(FEATURED_CONTENT_ENDPOINT)
}

/**
 * Fetches the featured networks from NDEx
 * @returns FeaturedNetworkResponse
 */
export const fetchFeaturedNetworks = async (): Promise<FeaturedNetworkResponse> => {
  return fetcher(FEATURED_NETWORK_ENDPOINT)
}

/**
 * Fetches blog content from multiple sources
 * @returns Promise containing an array of HTML content
 */
export const fetchBlogContent = async (): Promise<string[]> => {
  try {
    const responses = await Promise.all(
      BLOG_ENDPOINT.map(async (url) => {
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
