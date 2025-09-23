# User Public Page Feature Design

## Overview

This document outlines the architectural design for implementing a new user public page feature in NDEx3. The page will be accessible at `/users/<uuid>` and display public content that a user wants to publish in NDEx, using a layout similar to the my-account page but without editing controls.

## Requirements

1. **Route**: `/users/<uuid>` to display public user content
2. **Layout**: Same as my-account page but with modified left sidebar
3. **Left Sidebar**: Display user information instead of controls:
   - User image
   - Username
   - First name and last name
   - User description
   - NO '+ New' button or other controls
4. **Content Area**: Display user's public networks, shortcuts, and folders
5. **API Integration**: 
   - Use `user.getUser(uuid)` for user profile information
   - Use `user.getUserHomeContent(userUuid)` for content
6. **Reference**: Similar to https://www.ndexbio.org/index.html#/user/301a91c6-a37b-11e4-bda0-000c29202374

## Architecture

### Component Structure

```
src/app/users/
├── _components/
│   ├── UserPublicPage.tsx          # Main page component
│   ├── UserProfileSidebar.tsx      # User info sidebar (replaces controls)
│   └── UserContent.tsx             # Content display area
└── page.tsx                        # Route handler (if using file-system routing)
```

### Key Components

#### 1. UserPublicPage.tsx
- Main container component
- Manages data fetching for both user profile and content
- Handles loading states and error boundaries
- Layout structure similar to MyAccount.tsx

#### 2. UserProfileSidebar.tsx
- Displays user profile information
- Shows user image with fallback to initials
- Renders username, full name, and description
- Responsive design for collapsed/expanded states
- No action buttons or controls

#### 3. UserContent.tsx
- Reuses existing content display logic from my-account
- Shows networks, folders, and shortcuts
- Read-only view (no selection, no actions)
- Filters content based on public visibility

### Data Flow

#### User Profile Data
```typescript
// Hook: useUserProfile(uuid)
const { user, isLoading, error } = useUserProfile(uuid)

// API Call via ndex-client
const user = await ndexClient.user.getUser(uuid)
```

#### User Content Data
```typescript
// Hook: useUserHomeContent(uuid)
const { content, isLoading, error } = useUserHomeContent(uuid)

// API Call via ndex-client
const content = await ndexClient.user.getUserHomeContent(uuid)
```

### Route Handling

Add to root `page.tsx` for client-side routing:

```typescript
// Handle user profile routes that couldn't be statically generated
const userMatch = pathname?.match(/^\/users\/([^\/]+)$/)
if (userMatch) {
  const uuid = userMatch[1]
  console.log('Client-side user route for UUID:', uuid)
  return <UserPublicPage uuid={uuid} />
}
```

### API Integration

#### User Profile API
```typescript
interface UserProfileData {
  uuid: string
  userName: string
  firstName?: string
  lastName?: string
  description?: string
  image?: string
  // ... other NDExUser fields
}
```

#### User Content API
```typescript
interface UserContentItem {
  uuid: string
  name: string
  type: 'NETWORK' | 'FOLDER' | 'SHORTCUT'
  visibility: 'PUBLIC' | 'PRIVATE'
  modificationTime: string
  // ... other FileListItem fields
}
```

### UI/UX Specifications

#### Left Sidebar Layout
```
┌─────────────────────────┐
│   [User Image/Avatar]   │
│                         │
│      @username          │
│   First Name Last Name  │
│                         │
│   User Description      │
│   (multiline text)      │
│                         │
│   [Storage info]        │ (if public)
└─────────────────────────┘
```

#### Content Area
- Same table/grid layout as my-account
- No selection checkboxes
- No action buttons or dropdowns
- Read-only view with basic sorting/filtering
- Public content only

### Error Handling

#### User Not Found
```typescript
if (error?.status === 404) {
  return <UserNotFoundPage />
}
```

#### Private Profile
```typescript
if (error?.status === 403) {
  return <PrivateProfilePage />
}
```

#### Content Loading Errors
- Graceful fallback to empty state
- Error message for network issues
- Retry functionality

### Implementation Steps

1. **Create User Profile Hooks**
   - `useUserProfile(uuid)` - Fetch user data with SWR
   - `useUserHomeContent(uuid)` - Fetch user content with SWR

2. **Implement UserProfileSidebar Component**
   - User avatar with fallback
   - User info display
   - Responsive design
   - No action controls

3. **Create UserPublicPage Component**
   - Main layout container
   - Data fetching coordination
   - Error boundary handling
   - Loading states

4. **Implement UserContent Component**
   - Reuse existing content display logic
   - Filter public content only
   - Read-only mode
   - Remove interactive elements

5. **Add Route Handling**
   - Update root `page.tsx` for client-side routing
   - Handle UUID pattern matching
   - Static export compatibility

6. **Add Error Pages**
   - User not found page
   - Private profile page
   - Network error handling

### Testing Strategy

#### Unit Tests
- UserProfileSidebar component rendering
- UserContent filtering logic
- Hook data transformation
- Error state handling

#### Integration Tests
- Full page rendering with mock data
- API integration testing
- Route handling verification
- Error scenario testing

#### Manual Testing
- Test with various user profiles
- Verify responsive design
- Check error states
- Validate public content filtering

### Performance Considerations

1. **Data Caching**: Use SWR for efficient caching of user profiles
2. **Code Splitting**: Lazy load user page components
3. **Image Optimization**: Use Next.js Image component for user avatars
4. **Content Pagination**: Implement if user has large amounts of content

### Security Considerations

1. **Public Content Only**: Filter out private/internal content
2. **Rate Limiting**: Respect API rate limits for user profile requests
3. **Input Validation**: Validate UUID parameters
4. **XSS Prevention**: Sanitize user-generated content (descriptions)

### Future Enhancements

1. **Social Features**: Follow user, view activity
2. **Content Sharing**: Share links to user profiles
3. **Analytics**: Track profile views
4. **SEO Optimization**: Meta tags for user profiles
5. **User Customization**: Allow users to customize their public profiles

## File Structure

```
src/
├── app/
│   ├── users/
│   │   ├── _components/
│   │   │   ├── UserPublicPage.tsx
│   │   │   ├── UserProfileSidebar.tsx
│   │   │   └── UserContent.tsx
│   │   └── page.tsx (optional)
│   └── page.tsx (add user route handling)
├── hooks/
│   ├── use-user-profile.ts
│   └── use-user-home-content.ts
├── types/
│   └── ui/
│       └── userProfile.ts
└── components/
    └── ui/
        ├── UserAvatar.tsx
        └── ErrorPages/
            ├── UserNotFound.tsx
            └── PrivateProfile.tsx
```

## Dependencies

- Existing NDEx3 architecture and components
- `@js4cytoscape/ndex-client` for API calls
- SWR for data fetching and caching
- Next.js 15 App Router for routing
- Tailwind CSS and shadcn/ui for styling
- Existing hooks and utilities from my-account implementation

## Conclusion

This design provides a comprehensive blueprint for implementing the user public page feature while maintaining consistency with NDEx3's existing architecture and patterns. The implementation reuses proven components and patterns from the my-account page while adapting them for the public user profile use case.