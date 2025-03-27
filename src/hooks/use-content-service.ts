import useSWR from 'swr'
import { fetchFeaturedContent, fetchFeaturedNetworks, fetchBlogContent } from '@/lib/api/content-service'
import { useConfig } from '@/lib/contexts/ConfigContext'

/**
 * Custom hook for fetching featured content using SWR
 * @returns Object containing featured content and loading state
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
 * @returns Object containing featured networks and loading state
 */
export const useFeaturedNetworks = () => {
  const config = useConfig()
  const { data, error, isLoading } = useSWR('/featured-networks', () => 
    fetchFeaturedNetworks(config)
  )

  return {
    data: data || null, // Extract the "items" array from response
    isLoading,
    error,
  }
}

/**
 * Custom hook for fetching blog content using SWR
 * @returns Object containing blog content and loading state
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
