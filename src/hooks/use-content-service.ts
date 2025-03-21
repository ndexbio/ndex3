import useSWR from 'swr'
import { fetchFeaturedContent, fetchFeaturedNetworks, fetchBlogContent } from '@/lib/api/content-service'

/**
 * Custom hook for fetching featured content using SWR
 * @returns Object containing featured content and loading state
 */
export const useFeaturedContent = () => {
  const { data, error, isLoading } = useSWR('/featured-content', fetchFeaturedContent)

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
  const { data, error, isLoading } = useSWR('/featured-networks', fetchFeaturedNetworks)

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
  const { data, error, isLoading } = useSWR('/blog-content', fetchBlogContent)

  return {
    data: data || [],
    isLoading,
    error,
  }
}
