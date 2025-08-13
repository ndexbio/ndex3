import useSWR from 'swr'
import { fetchFeaturedContent, fetchFeaturedNetworks, fetchBlogContent, fetchLogos } from '@/lib/api/content-service'
import { useConfig } from '@/lib/contexts/ConfigContext'

/**
 * Content Service Hooks
 * 
 * These hooks provide React components with access to remote content data using SWR for caching and revalidation.
 * All content is fetched from remote configuration files hosted under the contentRootPath.
 * 
 * Content Structure:
 * - Featured Content: Carousel items for the home page hero section
 * - Featured Networks: Highlighted network data from NDEx
 * - Blog Content: HTML content for news/blog sections
 * - Logo Carousel: Partner/organization logos with links
 * 
 * Configuration URLs are built as: {contentRootPath}/{filename}
 * Example: https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json
 */

/**
 * Custom hook for fetching featured content using SWR
 * 
 * Fetches featured content data from remote configuration file.
 * The configuration file contains carousel items for the home page hero section.
 * 
 * Configuration file structure:
 * {
 *   "items": [
 *     {
 *       "type": "content_type",
 *       "text": "description_text", 
 *       "imageURL": "image_url",
 *       "title": "content_title",
 *       "URL": "optional_link_url",
 *       "UUID": "optional_network_uuid"
 *     }
 *   ]
 * }
 * 
 * @returns Object containing featured content data, loading state, and error state
 */
export const useFeaturedContent = () => {
  const config = useConfig()
  const { data, error, isLoading } = useSWR('/featured-content', () => 
    fetchFeaturedContent(config)
  )

  return {
    data,
    isLoading,
    error,
  }
}

/**
 * Custom hook for fetching featured networks using SWR
 * 
 * Fetches featured networks data from remote configuration file.
 * The configuration file contains highlighted network information from NDEx.
 * 
 * Configuration file structure:
 * {
 *   "items": [
 *     {
 *       "type": "network_type",
 *       "UUID": "network_uuid",
 *       "title": "network_title"
 *     }
 *   ]
 * }
 * 
 * @returns Object containing featured networks data, loading state, and error state
 */
export const useFeaturedNetworks = () => {
  const config = useConfig()
  const { data, error, isLoading } = useSWR('/featured-networks', () => 
    fetchFeaturedNetworks(config)
  )

  return {
    data: data || null,
    isLoading,
    error,
  }
}

/**
 * Custom hook for fetching blog content using SWR
 * 
 * Fetches main content configuration and then retrieves the corresponding HTML files.
 * This is a two-step process:
 * 1. Fetch the main content configuration file (contains list of HTML files)
 * 2. Fetch each HTML file specified in the configuration
 * 
 * Main content configuration file structure:
 * {
 *   "mainContent": [
 *     {
 *       "content": "doc4rudi.html"
 *     },
 *     {
 *       "content": "doc5rudi.html" 
 *     }
 *   ]
 * }
 * 
 * Note: The 'title' attribute is deprecated and no longer used.
 * Only the 'content' attribute (HTML filename) is processed.
 * 
 * @returns Object containing array of HTML content strings, loading state, and error state
 */
export const useBlogContent = () => {
  const config = useConfig()
  const { data, error, isLoading } = useSWR('/blog-content', () => 
    fetchBlogContent(config)
  )

  return {
    data: data || [],
    isLoading,
    error,
  }
}

/**
 * Custom hook for fetching logo carousel data using SWR
 * 
 * Fetches logo configuration from remote configuration file.
 * The configuration file contains partner/organization logos for the carousel.
 * 
 * Logo configuration file structure:
 * {
 *   "logos": [
 *     {
 *       "image": "logos/ucsd_logo_alt.png",
 *       "title": "University of California, San Diego",
 *       "href": "http://ucsd.edu/"
 *     }
 *   ]
 * }
 * 
 * Each logo object contains:
 * - image: Path to logo image file (relative to contentRootPath)
 * - title: Tooltip text displayed on hover
 * - href: URL to navigate to when logo is clicked
 * 
 * @returns Object containing array of Logo objects, loading state, and error state
 */
export const useLogos = () => {
  const config = useConfig()
  const { data, error, isLoading } = useSWR('/logos', () => 
    fetchLogos(config)
  )

  return {
    data: data || [],
    isLoading,
    error,
  }
}
