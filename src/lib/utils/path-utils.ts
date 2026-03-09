/**
 * Utility functions for handling paths with base path prefix
 * 
 * Note: This utility requires explicit base path management.
 * For React components, prefer using the useBasePath hook from ConfigContext
 * to maintain explicit dependencies and improve testability.
 */

/**
 * Prefixes a path with the base path for production deployments
 * @param path - The path to prefix
 * @param basePath - The base path to use (required for explicit dependency management)
 * @returns The prefixed path
 */
export const withBasePath = (path: string, basePath?: string): string => {
  // Use provided basePath or fallback to Next.js runtime data
  let actualBasePath = basePath || '';
  
  if (!actualBasePath && typeof window !== 'undefined') {
    // Fallback to Next.js runtime data only
    const nextData = (window as { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
    actualBasePath = nextData?.basePath || '';
  }
  
  // Don't prefix external URLs or already prefixed paths
  if (path.startsWith('http') || (actualBasePath && path.startsWith(actualBasePath))) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${actualBasePath}${normalizedPath}`;
};

