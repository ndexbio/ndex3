/**
 * Configuration Generator Script
 * 
 * This script reads from public/config.json (the single source of truth)
 * and generates:
 * 1. next.config.ts with the correct BASE_PATH
 * 2. Copies config.json to the urlBaseName path for deployment
 */

import fs from 'fs'
import { fileURLToPath } from 'url';
import path from 'path'

// Read the master configuration from public/config.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const masterConfigPath = path.join(__dirname, '..', 'public', 'config.json')
const masterConfig = JSON.parse(fs.readFileSync(masterConfigPath, 'utf8'))

// Extract values from master config
const urlBaseName = masterConfig.urlBaseName || ''

// Generate next.config.ts
const nextConfigContent = `import type { NextConfig } from 'next'

// Base path configuration - generated from public/config.json
export const BASE_PATH = '${urlBaseName}'

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
`

// Write next.config.ts (config.json is the source, don't overwrite it)
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts')

fs.writeFileSync(nextConfigPath, nextConfigContent)

// For development with basePath, also create config in the expected location
if (urlBaseName) {
  const devConfigDir = path.join(__dirname, '..', 'public', urlBaseName.substring(1))
  const devConfigPath = path.join(devConfigDir, 'config.json')
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(devConfigDir)) {
    fs.mkdirSync(devConfigDir, { recursive: true })
  }
  
  // Copy config to the base path location for development
  fs.writeFileSync(devConfigPath, JSON.stringify(masterConfig, null, 2))
  console.log(`📁 Copied config to: ${path.relative(process.cwd(), devConfigPath)}`)
}

console.log('✅ Configuration files generated successfully!')
console.log(`📁 Generated: ${path.relative(process.cwd(), nextConfigPath)}`)
console.log(`📁 Source config: ${path.relative(process.cwd(), masterConfigPath)}`)
console.log(`🌐 Base path: ${urlBaseName || '/ (root)'}`)
