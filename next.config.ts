import type { NextConfig } from 'next'

// Base path configuration - generated from public/config.json
export const BASE_PATH = ''

const nextConfig: NextConfig = {
  /* config options here */
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Allow SVG images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
}

export default nextConfig
