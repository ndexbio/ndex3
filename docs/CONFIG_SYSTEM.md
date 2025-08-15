# Configuration System - Single Source of Truth

## Overview

The application now uses `public/config.json` as the **single source of truth** for all configuration values, including the `urlBaseName` which determines the base path where the app is served.

## Key Changes

### 1. Eliminated `generate-config.js`
- **Before**: Had to run `npm run generate-config` to sync base path from `next.config.ts` to `config.json`
- **After**: `next.config.ts` reads directly from `config.json` at build time

### 2. Single Source of Truth
- **Configuration File**: `public/config.json`
- **Base Path Control**: The `urlBaseName` field in config.json controls where the app is served
- **Fallback Behavior**: If `urlBaseName` is missing or empty, the app runs under root path "/"

### 3. Build Process Simplified
- **Before**: `npm run build` → `npm run generate-config && next build`
- **After**: `npm run build` → `next build` (reads config.json directly)

## Configuration Structure

```json
{
  "ndexBaseUrl": "dev1.ndexbio.org",
  "keycloakConfig": {
    "url": "https://dev1.ndexbio.org/auth2",
    "clientId": "cytoscapendex",
    "realm": "ndex"
  },
  "urlBaseName": "/ndex3",  // Controls app base path - can be empty for root "/"
  "uiContent": {
    "contentRootPath": "https://home.ndexbio.org/landing_page_content/v2_4_2",
    "featuredContent": "featured_content.json",
    "featuredNetwork": "featured_networks.json", 
    "mainContent": "main.json",
    "logos": "logos.json"
  }
}
```

## How It Works

### Build Time
1. `next.config.ts` reads `public/config.json`
2. Extracts `urlBaseName` value (or defaults to empty string)
3. Sets Next.js `basePath` and `assetPrefix` accordingly

### Runtime
1. `ConfigProvider` loads config.json via fetch
2. Makes configuration available throughout the app via `useConfig()` hook
3. `useBasePath()` hook provides easy access to the base path value

## Usage Examples

### Changing Base Path
To serve the app under `/myapp` instead of `/ndex3`:

```json
{
  "urlBaseName": "/myapp",
  // ... rest of config
}
```

### Serving at Root
To serve the app at the root path:

```json
{
  "urlBaseName": "",
  // ... rest of config
}
```

Or simply omit the `urlBaseName` field entirely.

### Using Configuration in Components

```typescript
import { useConfig, useBasePath } from '@/lib/contexts/ConfigContext'

function MyComponent() {
  const config = useConfig()
  const basePath = useBasePath()
  
  console.log('NDEx Base URL:', config.ndexBaseUrl)
  console.log('App Base Path:', basePath)
  
  return <div>...</div>
}
```

## Benefits

1. **Single Source of Truth**: All configuration in one place
2. **No Build Script Dependencies**: Eliminated need for `generate-config.js`
3. **Flexible Deployment**: Easy to change base path without code changes
4. **Type Safety**: Full TypeScript support with `AppConfig` interface
5. **Runtime Access**: Configuration available throughout the app via React context

## Migration Notes

- The `generate-config.js` script has been removed
- The `generate-config` npm script has been removed from `package.json`
- `urlBaseName` is now optional in the `AppConfig` TypeScript interface
- Path utilities automatically handle missing or empty base paths
