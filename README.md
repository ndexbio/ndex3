# NDEx3: New Frontend for NDEx (Version 3)

A new Next.js-based frontend for the Network Data Exchange (NDEx) platform, providing a user-friendly interface for network biology data management, sharing, and visualization.

## Overview

NDEx3 is a complete rewrite of the NDEx frontend using web technologies including Next.js, TypeScript, and Tailwind CSS. It provides users with tools to manage, share, and explore biological network data through an intuitive web interface.

## Key Features

- 🔐 **Keycloak Authentication** - Secure user authentication and authorization
- 🌐 **Network Management** - Upload, organize, and manage biological networks
- 📁 **Folder Organization** - Hierarchical organization of networks and data
- 🔍 **Advanced Search** - Search networks and users across the platform  
- 🎨 **Modern UI** - Responsive design with dark/light theme support
- 📊 **Dynamic Content** - Configurable home page content from external sources
- 🚀 **Performance Optimized** - Built with Next.js App Router for optimal performance

## Content System

NDEx3 features a dynamic content configuration system that allows updating home page content without code deployments:

- **Remote Configuration**: Content fetched from external JSON files
- **Direct Browser Fetching**: No server-side proxies needed
- **Four Content Types**: Featured content carousel, featured networks, blog content, and logo carousel
- **Error Handling**: Comprehensive fallback states for content loading failures

See [`CONTENT_SYSTEM_README.md`](./docs/CONTENT_SYSTEM_README.md) and [`CONTENT_CONFIGURATION.md`](./docs/CONTENT_CONFIGURATION.md) for detailed documentation.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ndexbio/ndex3.git
   cd ndex3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the application**
   
   Copy and customize the configuration:
   ```bash
   cp public/config-example-root.json public/config.json
   ```
   
   Edit `public/config.json` with your settings:
   ```json
   {
     "ndexBaseUrl": "your-ndex-server.com",
     "keycloakConfig": {
       "url": "https://your-keycloak-server/auth",
       "clientId": "your-client-id", 
       "realm": "your-realm"
     },
     "uiContent": {
       "contentRootPath": "https://your-content-server.com/content/v1",
       "featuredContent": "featured_content.json",
       "featuredNetwork": "featured_networks.json",
       "mainContent": "main.json",
       "logos": "logos.json"
     }
   }
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture

NDEx3 follows a modern Next.js App Router architecture with a focus on **feature-based colocation**, **server components**, and **static export compatibility**.

### Project Structure

```
public/                      # Static assets and configuration
├── config.json              # Application configuration
└── config-example-root.json # Configuration template

src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Root page (home + client-side routing)
│   ├── loading.tsx          # Global loading UI
│   ├── error.tsx            # Global error boundary
│   │
│   ├── _components/         # Home page components (feature-based)
│   │
│   ├── search/              # Search feature
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── _components/     # Search-specific components
│   │
│   ├── my-account/          # Account management feature
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── _components/     # Account-specific components
│   │
│   ├── folders/[uuid]/      # Dynamic folder feature
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── error.tsx
│   │
│   └── (other features...)
│
├── components/              # Shared React components
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── SearchBox.tsx        # Example shared component
│   └── UserAvatar.tsx       # Example shared component
│
├── hooks/                   # Custom React hooks (e.g., use-network-search)
│
├── lib/                     # Utilities, API clients, and contexts
│   ├── api/                 # API clients (NDEx, content service)
│   ├── contexts/            # React contexts (Config, Keycloak)
│   └── utils/               # Utility functions
│
├── stores/                  # State management (Zustand)
│
└── types/                   # TypeScript type definitions
```

### Key Architectural Concepts

- **Feature-Based Colocation**: Components are located with the features that use them (`src/app/[feature]/_components/`), improving maintainability.
- **Shared Components**: Truly shared components reside in `src/components/`.
- **Hybrid Routing**: Due to `output: 'export'` for static deployment, the app uses a hybrid routing strategy:
  - **File-System Routing**: For all static routes (`/search`, `/my-account`).
  - **Client-Side Routing**: The root `page.tsx` handles dynamic routes with unlimited UUIDs (`/folders/[uuid]`) that cannot be pre-generated.
- **Loading & Error Boundaries**: Each route has its own `loading.tsx` and `error.tsx` for a resilient and user-friendly experience, leveraging React Suspense and Error Boundaries automatically.
- **Static Export**: The application is optimized for static hosting, with `output: 'export'` configured in `next.config.ts`.

See [`ROUTING_REFACTOR_PLAN.md`](./ROUTING_REFACTOR_PLAN.md) for a detailed breakdown of the routing architecture.

## Configuration

### Application Config (`public/config.json`)

The main configuration file defines:

- **ndexBaseUrl**: NDEx server URL
- **keycloakConfig**: Authentication server settings  
- **uiContent**: Dynamic content configuration
- **urlBaseName**: Optional URL base path

### Content Configuration

Content is fetched from external JSON files defined in the `uiContent` configuration:

- **contentRootPath**: Base URL for all content files
- Content files: `featured_content.json`, `featured_networks.json`, `main.json`, `logos.json`

## Deployment

### Static Export

Build and export the application for static hosting:

```bash
npm run build
```

The exported files will be in the `out/` directory.

### Apache Configuration

For Apache deployments, see [`APACHE_STATIC_DEPLOYMENT.md`](./APACHE_STATIC_DEPLOYMENT.md) for detailed configuration instructions.

## Development

### Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework  
- **shadcn/ui** - Modern UI component library
- **SWR** - Data fetching with caching
- **Keycloak** - Authentication and authorization
- **Zustand** - Lightweight state management

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## Authentication

NDEx3 uses Keycloak for authentication. Configure your Keycloak server details in the `keycloakConfig` section of `public/config.json`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [`CONTENT_SYSTEM_README.md`](./CONTENT_SYSTEM_README.md) - Content system overview
- [`CONTENT_CONFIGURATION.md`](./CONTENT_CONFIGURATION.md) - Detailed content configuration
- [`APACHE_STATIC_DEPLOYMENT.md`](./APACHE_STATIC_DEPLOYMENT.md) - Apache deployment guide
- [`ROUTING_REFACTOR_PLAN.md`](./ROUTING_REFACTOR_PLAN.md) - Application routing documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the NDEx team or create an issue in the GitHub repository.
