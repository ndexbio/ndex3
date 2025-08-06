/**
 * Utility functions for handling paths with base path prefix
 * Uses urlBaseName from config.json as the single source of truth
 */

/**
 * Prefixes a path with the base path for production deployments
 * @param path - The path to prefix
 * @param basePath - Optional base path override
 * @returns The prefixed path
 */
export const withBasePath = (path: string, basePath?: string): string => {
  // Use provided basePath or try to get it from various sources
  let actualBasePath = basePath || '';
  
  if (!actualBasePath) {
    if (typeof window !== 'undefined') {
      // Primary source: basePath from stored app config (set by ConfigContext)
      const storedBasePath = (window as { __APP_BASE_PATH__?: string }).__APP_BASE_PATH__;
      if (storedBasePath) {
        actualBasePath = storedBasePath;
      } else {
        // Fallback to Next.js runtime data
        const nextData = (window as { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
        actualBasePath = nextData?.basePath || '';
      }
    }
  }
  
  // Don't prefix external URLs or already prefixed paths
  if (path.startsWith('http') || (actualBasePath && path.startsWith(actualBasePath))) {
    return path;
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${actualBasePath}${normalizedPath}`;
};

/**
 * Prefixes an API path with the base path
 * @param apiPath - The API path to prefix
 * @param basePath - Optional base path override
 * @returns The prefixed API path
 */
export const withApiBasePath = (apiPath: string, basePath?: string): string => {
  return withBasePath(apiPath, basePath);
};
