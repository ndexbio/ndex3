# Content Configuration System

This section documents the dynamic content configuration system used for the NDEx application home page.

## Quick Start

The home page content is configured through remote JSON files hosted under a common base URL. The main configuration is in `public/config.json`:

```json
{
  "uiContent": {
    "contentRootPath": "https://home.ndexbio.org/landing_page_content/v2_4_2",
    "featuredContent": "featured_content.json",
    "featuredNetwork": "featured_networks.json",
    "mainContent": "main.json", 
    "logos": "logos.json"
  }
}
```

## Content Types

| Content Type | Purpose | Configuration File | Component |
|--------------|---------|-------------------|-----------|
| Featured Content | Hero carousel items | `featured_content.json` | `FeaturedContentCarousel` |
| Featured Networks | Highlighted NDEx networks | `featured_networks.json` | `FeaturedNetworksButton` |
| Main Content | Blog/news HTML content | `main.json` | `BlogContent` |
| Logo Carousel | Partner organization logos | `logos.json` | `LogoCarousel` |

## Key Features

- **Remote Configuration**: All content is fetched from external JSON files
- **Dynamic Updates**: Content can be updated without code deployments
- **Direct Fetching**: All content fetched directly from external URLs (both dev/prod)
- **Error Handling**: Comprehensive loading, error, and empty states
- **Caching**: SWR-based caching and revalidation
- **Type Safety**: Full TypeScript support with proper type definitions

## Configuration Examples

### Logo Configuration (`logos.json`)
```json
{
  "logos": [
    {
      "image": "logos/ucsd_logo_alt.png",
      "title": "University of California, San Diego",
      "href": "http://ucsd.edu/"
    }
  ]
}
```

### Main Content Configuration (`main.json`)
```json
{
  "mainContent": [
    {
      "content": "doc4rudi.html"
    }
  ]
}
```

## Implementation Files

- **Types**: `src/types/entities/AppConfig.ts` - TypeScript definitions
- **Services**: `src/lib/api/content-service.ts` - Content fetching logic
- **Hooks**: `src/hooks/use-content-service.ts` - React hooks for components
- **Components**: `src/app/_components/` - UI components that consume content (co-located with the home page feature)

## Content Fetching

**Both Development and Production**: Direct browser-to-external-server fetching
- Content is fetched directly from `{contentRootPath}/{filename}` URLs
- CORS is handled by the external content server (home.ndexbio.org)
- No application-specific proxy servers or API routes needed
- Error handling displays appropriate fallback messages for any content loading failures
- Simplified architecture with direct external fetching


## Documentation

See `CONTENT_CONFIGURATION.md` for complete documentation including:
- Detailed configuration structure
- All content type specifications
- Implementation details
- Troubleshooting guide
- Migration notes

## Usage in Components

```typescript
import { useLogos } from '@/hooks/use-content-service'

function MyComponent() {
  const { data: logos, isLoading, error } = useLogos()
  
  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div>
      {logos.map(logo => (
        <img key={logo.image} src={logo.image} alt={logo.title} />
      ))}
    </div>
  )
}
