# Content Configuration Documentation

This document describes the new content configuration system for the NDEx application home page. The system uses a centralized approach where all content is hosted remotely and configured through JSON files.

## Overview

The content configuration system is designed to allow dynamic content management without requiring code deployments. All content is fetched from remote configuration files hosted under a common base URL.

## Configuration Structure

### Main Configuration (config.json)

The main application configuration file contains the `uiContent` object that defines the content system:

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

### Configuration Properties

- **contentRootPath**: Base URL for all content configuration files
- **featuredContent**: Filename for featured content carousel configuration
- **featuredNetwork**: Filename for featured networks configuration
- **mainContent**: Filename for main content (blog/news) configuration
- **logos**: Filename for logo carousel configuration

## Content Types

### 1. Featured Content

**File**: `{contentRootPath}/{featuredContent}`  
**Example URL**: `https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json`

**Purpose**: Defines carousel items for the home page hero section.

**Structure**:
```json
{
  "items": [
    {
      "type": "content_type",
      "text": "Description text for the item",
      "imageURL": "https://example.com/image.jpg",
      "title": "Content Title",
      "URL": "https://optional-link.com",
      "UUID": "optional-network-uuid"
    }
  ]
}
```

**Properties**:
- `type`: Content type identifier
- `text`: Description text displayed in the carousel
- `imageURL`: URL to the featured image
- `title`: Title of the content item
- `URL`: Optional link URL when item is clicked
- `UUID`: Optional network UUID for NDEx-specific content

### 2. Featured Networks

**File**: `{contentRootPath}/{featuredNetwork}`  
**Example URL**: `https://home.ndexbio.org/landing_page_content/v2_4_2/featured_networks.json`

**Purpose**: Defines highlighted network data from NDEx.

**Structure**:
```json
{
  "items": [
    {
      "type": "network_type",
      "UUID": "network-uuid-here",
      "title": "Network Title"
    }
  ]
}
```

**Properties**:
- `type`: Network type identifier
- `UUID`: NDEx network UUID
- `title`: Display title for the network

### 3. Main Content (Blog/News)

**File**: `{contentRootPath}/{mainContent}`  
**Example URL**: `https://home.ndexbio.org/landing_page_content/v2_4_2/main.json`

**Purpose**: Defines HTML content files to be displayed in content boxes.

**Structure**:
```json
{
  "mainContent": [
    {
      "content": "doc4rudi.html"
    },
    {
      "content": "doc5rudi.html"
    },
    {
      "content": "doc9rudi.html"
    }
  ]
}
```

**Properties**:
- `content`: HTML filename to be rendered (located under contentRootPath)

**Important Notes**:
- The `title` attribute is **deprecated** and no longer used
- Only the `content` attribute (HTML filename) is processed
- HTML files are fetched from: `{contentRootPath}/{content}`

### 4. Logo Carousel

**File**: `{contentRootPath}/{logos}`  
**Example URL**: `https://home.ndexbio.org/landing_page_content/v2_4_2/logos.json`

**Purpose**: Defines partner/organization logos for the carousel.

**Structure**:
```json
{
  "logos": [
    {
      "image": "logos/ucsd_logo_alt.png",
      "title": "University of California, San Diego",
      "href": "http://ucsd.edu/"
    },
    {
      "image": "logos/cytoscape_logo.png", 
      "title": "Cytoscape Consortium",
      "href": "http://www.cytoscape.org/"
    }
  ]
}
```

**Properties**:
- `image`: Path to logo image file (relative to contentRootPath)
- `title`: Tooltip text displayed when hovering over the logo
- `href`: URL that the logo should link to when clicked

**Image URLs**: Logo images are accessed at `{contentRootPath}/{image}`

## Implementation Details

### Content Fetching

**Both Development and Production:**
- Direct browser calls to external content URLs (`{contentRootPath}/{filename}`)
- CORS handled by external content server (home.ndexbio.org)  
- No application-specific proxy servers or API routes needed
- Error handling displays appropriate fallback messages for any content loading failures
- Simplified architecture with direct external fetching

### Error Handling

Each content type includes comprehensive error handling:
- Loading states with skeleton placeholders
- Error states with descriptive messages
- Fallback content when data is unavailable
- Configuration URL display for debugging

## File Organization

```
src/
├── types/entities/AppConfig.ts          # Type definitions
├── lib/api/content-service.ts           # Content fetching functions
├── hooks/use-content-service.ts         # React hooks for content
└── components/home/
    ├── LogoCarousel.tsx                 # Logo carousel component
    ├── BlogContent.tsx                  # Blog content component
    └── FeaturedContentCarousel.tsx      # Featured content component
```

## Usage Examples

### Using Content Hooks

```typescript
import { useLogos, useBlogContent, useFeaturedContent } from '@/hooks/use-content-service'

function MyComponent() {
  const { data: logos, isLoading, error } = useLogos()
  const { data: blogContent } = useBlogContent()
  const { data: featuredContent } = useFeaturedContent()
  
  // Handle loading, error, and success states
}
```

### Configuration URLs

Given the configuration:
```json
{
  "contentRootPath": "https://home.ndexbio.org/landing_page_content/v2_4_2",
  "logos": "logos.json"
}
```

The logos will be fetched from:
`https://home.ndexbio.org/landing_page_content/v2_4_2/logos.json`

And logo images will be loaded from:
`https://home.ndexbio.org/landing_page_content/v2_4_2/logos/ucsd_logo_alt.png`

## Troubleshooting

### Common Issues

1. **Content Loading Issues**:
   - Verify external content server (home.ndexbio.org) is accessible
   - Check browser network tab for failed requests to contentRootPath URLs
   - Ensure content files exist at the specified URLs

2. **Missing Content**:
   - Check contentRootPath URL accessibility
   - Verify filename configurations
   - Check browser network tab for failed requests

3. **Image Loading Issues**:
   - Ensure image paths are relative to contentRootPath
   - Check image file accessibility
   - Verify image file extensions and naming

### Debug Information

Components display configuration URLs in error states to help with debugging:
- Logo carousel shows: `{contentRootPath}/{logos}`
- Error messages include the attempted fetch URL
- Console warnings provide additional context in development mode
