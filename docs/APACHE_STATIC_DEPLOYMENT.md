# Apache Static Deployment Guide

## Overview

The Next.js application has been successfully configured for static export and can now be deployed under Apache as static files. The build generates an `out/` directory containing all static assets.

This example below assume the app is deployed under the /ndex3/ path.

## Build Process

```bash
# Generate static files
npm run build

# This creates an 'out/' directory with all static files
```

## Apache Configuration

### Basic Static File Serving

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/html
    
    # Serve static files from /ndex3
    Alias /ndex3 /path/to/your/nextjs/out
    
    <Directory "/path/to/your/nextjs/out">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Handle client-side routing for SPA
        RewriteEngine On
        RewriteBase /ndex3/
        
        # Don't rewrite files that exist
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        
        # Rewrite everything else to index.html for client-side routing
        RewriteRule . /ndex3/index.html [L]
    </Directory>
    
    # Add CORS headers for external API calls
    <LocationMatch "^/ndex3/">
        Header always set Access-Control-Allow-Origin "*"
        Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
        Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    </LocationMatch>
    
    # Enable compression
    <LocationMatch "\.(js|css|html|json|svg|png|jpg|jpeg|gif|ico)$">
        SetOutputFilter DEFLATE
    </LocationMatch>
    
    # Cache static assets
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 month"
    </LocationMatch>
    
</VirtualHost>
```

## Deployment Steps

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Copy static files to Apache:**
   ```bash
   cp -r out/* /path/to/apache/htdocs/ndex3/
   ```

3. **Configure Apache** with the above configuration

4. **Restart Apache:**
   ```bash
   sudo systemctl restart apache2
   ```

## Available Routes

The static export includes these pages:
- `/ndex3/` - Home page
- `/ndex3/search/` - Search page  
- `/ndex3/my-account/` - My Account page
- `/ndex3/profile/` - Profile page
- `/ndex3/settings/` - Settings page
- `/ndex3/shared-with-me/` - Shared with Me page
- `/ndex3/trash/` - Trash page

## Limitations

**Removed Features** (due to static export requirements):
- User profile pages (`/users/[uuid]`) - Required server-side rendering
- Folder pages (`/folder/[uuid]`) - Required server-side rendering
- API proxy routes - Replaced with direct external API calls

## Content Fetching

The application now fetches content directly from external URLs specified in `config.json`:

- **Featured Content**: `https://home.ndexbio.org/landing_page_content/v2_4_2/featured_content.json`
- **Featured Networks**: `https://home.ndexbio.org/landing_page_content/v2_4_2/featured_networks.json`
- **Blog Content**: Direct URLs to HTML files (doc4rudi.html, doc5rudi.html, doc7rudi.html)
- **Logo Data**: Embedded directly in config.json

No proxy configuration is needed as the external server handles CORS appropriately.

## File Structure

```
out/
├── index.html          # Main page
├── config.json         # App configuration
├── *.svg              # Static assets
├── _next/             # Next.js assets
├── search/            # Search page
├── my-account/        # My Account page
├── profile/           # Profile page
├── settings/          # Settings page
├── shared-with-me/    # Shared with Me page
└── trash/             # Trash page
```

## Testing

After deployment, test the application at:
- `http://yourdomain.com/ndex3/`

All client-side routing should work correctly, and external content should load (assuming no CORS restrictions).
