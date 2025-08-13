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

/**
 * Prefixes an API path with the base path
 * @param apiPath - The API path to prefix  
 * @param basePath - The base path to use (required for explicit dependency management)
 * @returns The prefixed API path
 */
export const withApiBasePath = (apiPath: string, basePath?: string): string => {
  return withBasePath(apiPath, basePath);
};

/**
 * React hook for creating path utilities with base path from config context
 * This provides a cleaner, more testable alternative to global window properties
 * 
 * Usage:
 * ```tsx
 * import { useConfig } from '@/lib/contexts/ConfigContext'
 * import { createPathUtils } from '@/lib/utils/path-utils'
 * 
 * const MyComponent = () => {
 *   const config = useConfig()
 *   const { withBasePath, withApiBasePath } = createPathUtils(config.urlBaseName)
 *   
 *   return <a href={withBasePath('/some-path')}>Link</a>
 * }
 * ```
 */
export const createPathUtils = (basePath: string) => ({
  withBasePath: (path: string) => withBasePath(path, basePath),
  withApiBasePath: (apiPath: string) => withApiBasePath(apiPath, basePath),
});
