/**
 * Content Service API Client
 * This module contains functions for fetching dynamic UI content from an external service
 */
import { FeaturedContentResponse, FeaturedNetworkResponse } from '@/types/api/ui/content';

/**
 * Fetches featured content data from the external service
 * @returns Promise containing featured content data
 */
const FEATURED_CONTENT_ENDPOINT = 'https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json'
const FEATURED_NETWORK_ENDPOINT = 'https://home.ndexbio.org/landing_page_content/v2_4_2/featured_networks.json'
const BLOG_ENDPOINT = [
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc4rudi.html',
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc7rudi.html',
  'https://home.ndexbio.org/landing_page_content/v2_4_2/doc5rudi.html'
]

export const fetchFeaturedContent = async (): Promise<FeaturedContentResponse> => {
  try {
    const response = await fetch(FEATURED_CONTENT_ENDPOINT, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch featured content: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching featured content:', error);
    throw error;
  }
};

/**
 * Fetches the featured networks from NDEx
 * @returns Promise containing array of featured networks
 */
export const fetchFeaturedNetworks = async (): Promise<FeaturedNetworkResponse> => {
  try {
    const response = await fetch(FEATURED_NETWORK_ENDPOINT, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch featured networks: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching featured networks:', error);
    throw error;
  }
}; 

/**
 * Fetches blog content from the external service
 * @returns Promise containing the content of the blog in html format
 */

export const fetchBlogContent = async (): Promise<string[]> => {
  try {
    const responses = await Promise.all(
      BLOG_ENDPOINT.map((url) =>
        fetch(url, { method: 'GET' }).then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch blog content: ${res.statusText}`);
          }
          return res.text(); // Get HTML content as text
        })
      )
    );

    return responses; // Returns an array of HTML content from each blog URL
  } catch (error) {
    console.error('Error fetching blog content:', error);
    throw error;
  }
};
