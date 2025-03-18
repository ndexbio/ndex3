import { useState, useEffect } from 'react';
import { fetchFeaturedContent, fetchFeaturedNetworks, fetchBlogContent} from '@/lib/api/content-service';
import { FeaturedContentResponse, FeaturedNetwork } from '@/types/api/ui/content';

/**
 * Custom hook for fetching featured content
 * @returns Object containing featured content and loading state
 */
export const useFeaturedContent = () => {
  const [data, setData] = useState<FeaturedContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getFeaturedContent = async () => {
      try {
        setIsLoading(true);
        const content = await fetchFeaturedContent();
        setData(content);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to fetch featured content');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    getFeaturedContent();
  }, []);

  return { data, isLoading, error };
};

/**
 * Custom hook for fetching featured networks
 * @returns Object containing featured networks and loading state
 */
export const useFeaturedNetworks = () => {
  const [data, setData] = useState<FeaturedNetwork[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getFeaturedNetworks = async () => {
      try {
        setIsLoading(true);
        const networks = await fetchFeaturedNetworks();
        setData(networks.items);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch featured networks');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    getFeaturedNetworks();
  }, []);

  return { data, isLoading, error };
}; 

export const useBlogContent = () => {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getBlogContent = async () => {
      try {
        setIsLoading(true);
        const content = await fetchBlogContent();
        setData(content);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to fetch blog content');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    getBlogContent();
  }, []);

  return { data, isLoading, error };
}