# Configuration System

## Overview

The application's configuration is managed through a **single source of truth** (`public/config.json`) and a build-time script (`scripts/generate-config.js`) that ensures consistency between the runtime configuration and Next.js build settings.

## Core Components

### 1. `public/config.json` (Single Source of Truth)
This file is the master configuration for the application. It defines all runtime parameters, including the `urlBaseName` which controls the application's base path.

```json
{
  "urlBaseName": "/ndex3",
  // ... other settings
}
```

### 2. `scripts/generate-config.js` (Build-Time Script)
This script is a critical part of the build process. It reads `public/config.json` and performs two key actions:

1. **Generates `next.config.ts`**: It creates the Next.js configuration file with the `basePath` and `assetPrefix` set to the `urlBaseName` from `config.json`.
2. **Copies `config.json`**: For deployments with a base path, it copies `config.json` to the appropriate subdirectory (e.g., `public/ndex3/config.json`) so the application can fetch it at runtime.

### 3. `next.config.ts` (Generated File)
This file is **generated automatically** by `scripts/generate-config.js` and should not be edited manually. It contains the Next.js build configuration derived from `public/config.json`.

## How It Works

### Build Process (`npm run build`)
The build process is orchestrated through the `generate-config` script:

1. **`npm run build`** triggers **`npm run generate-config && next build`**.
2. **`generate-config` script runs**:
   - Reads `public/config.json`.
   - Generates `next.config.ts` with the correct `basePath`.
   - Copies `config.json` to `public/ndex3/config.json` (if `urlBaseName` is `/ndex3`).
3. **`next build` runs** using the generated `next.config.ts`.

### Runtime
1. The `ConfigProvider` fetches the configuration from the base path URL (e.g., `/ndex3/config.json`).
2. The configuration is made available throughout the app via the `useConfig()` hook.

## Usage

### Changing the Base Path
To change the application's base path from `/ndex3` to `/myapp`:

1. **Edit `public/config.json`**:
   ```json
   {
     "urlBaseName": "/myapp",
     // ... rest of config
   }
   ```
2. **Re-run the build**:
   ```bash
   npm run build
   ```
   The `generate-config.js` script will automatically update `next.config.ts` and copy the config file to `public/myapp/config.json`.

### Serving at the Root
To serve the app at the root path (`/`):

1. **Edit `public/config.json`**:
   ```json
   {
     "urlBaseName": "",
     // ... rest of config
   }
   ```
2. **Re-run the build**.

## Benefits

- **Single Source of Truth**: All configuration is managed in `public/config.json`.
- **Consistency**: The build script ensures the Next.js `basePath` and runtime configuration are always in sync.
- **Flexible Deployment**: Easily change the base path without manual code changes.
- **Type Safety**: Full TypeScript support with the `AppConfig` interface.
