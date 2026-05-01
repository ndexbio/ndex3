# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

### Build and Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production (runs config generation then Next.js build)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run generate-config` - Generate Next.js config from public/config.json

### Configuration Management
The application uses a **single source of truth** configuration system:
- Main config: `public/config.json` (edit this file)
- Build script: `scripts/generate-config.js` (automatically generates `next.config.ts`)
- Never edit `next.config.ts` manually - it's generated from `public/config.json`

## Architecture Overview

### Routing Strategy (Hybrid Approach)
Due to static export requirements (`output: 'export'`), the app uses hybrid routing:
- **File-system routes**: Static routes like `/search`, `/my-account` 
- **Client-side routing**: Dynamic UUID routes handled in root `page.tsx` (e.g., `/folders/[uuid]`)

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── [feature]/         # Feature-based routes 
│   │   ├── page.tsx       # Route component
│   │   ├── loading.tsx    # Loading UI
│   │   ├── error.tsx      # Error boundary
│   │   └── _components/   # Feature-specific components
│   └── _components/       # Home page components
├── components/            # Shared UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # API clients, contexts, utilities
│   ├── api/              # NDEx API and content service clients
│   ├── contexts/         # React contexts (Config, Keycloak)  
│   └── utils/            # Utility functions
├── stores/               # Zustand state management
└── types/                # TypeScript definitions
```

### Key Architectural Principles
- **Feature-based colocation**: Components live with features that use them
- **Static export compatibility**: Optimized for static hosting with Apache
- **Configuration-driven**: Runtime behavior controlled by `public/config.json`

## Technology Stack

### Core Framework
- **Next.js 15** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library

### Key Dependencies
- **@js4cytoscape/ndex-client**: Local NDEx API client (file: dependency)
- **keycloak-js**: Authentication 
- **SWR**: Data fetching with caching
- **Zustand**: Lightweight state management
- **React DnD**: Drag and drop functionality
- **@tanstack/react-table & react-virtual**: Data tables with virtualization

### State Management
- **SWR** for server state caching
- **Zustand** for client state
- **React Context** for configuration and auth

## Configuration System

### Single Source of Truth: `public/config.json`
This file controls all application behavior:
```json
{
  "ndexBaseUrl": "your-ndex-server.com",
  "urlBaseName": "/ndex3",
  "keycloakConfig": { ... },
  "uiContent": { ... }
}
```

### Build Process
1. `npm run build` triggers `generate-config` script
2. Script reads `public/config.json` 
3. Generates `next.config.ts` with correct `basePath`
4. Copies config to `public/[urlBaseName]/config.json` for deployment

### Changing Base Path
To deploy at different URL paths, edit `urlBaseName` in `public/config.json` and rebuild.

## Content Management
- **Dynamic content** fetched from external JSON files
- **Content types**: featured content, networks, blogs, logos
- **Configuration**: Defined in `uiContent` section of config
- **Fallback handling**: Comprehensive error states for content failures

## Authentication
- **Keycloak integration** for SSO
- **Configuration**: Set `keycloakConfig` in `public/config.json`
- **Context provider**: `ConfigProvider` and `KeycloakProvider` in root layout

## Development Practices

### Path Aliases
- Use `@/` for imports from `src/` directory
- TypeScript paths configured in `tsconfig.json`

### Component Organization
- Feature-specific components: `src/app/[feature]/_components/`
- Shared components: `src/components/`
- UI primitives: `src/components/ui/` (shadcn/ui)

### Error Handling
- Each route has `error.tsx` boundary
- Loading states with `loading.tsx`
- Content fallbacks for API failures

### Static Export Considerations
- Images: `unoptimized: true` in Next.js config
- No server-side features (API routes, middleware, etc.)
- Trailing slashes enforced for Apache compatibility

## Deployment

### Static Export
The app builds to `out/` directory for static hosting:
- Apache configuration files provided in repo root
- Base path handled automatically via config system
- Assets prefixed with `basePath` for subdirectory deployment

### Local Development vs Production
- Dev: Uses Next.js dev server with dynamic config loading
- Production: Static files with config copied to base path location

### Google Analytics 
- In order to enable Google Analytics, export NEXT_PUBLIC_GA_ID=GS-XXXXX (the analytics ID) prior to running the build.