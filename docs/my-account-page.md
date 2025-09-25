# NDEx3 My Account Page Technical Documentation

## Overview

The My Account page is a comprehensive file management interface for the NDEx3 web application that allows users to manage their networks and folders. It provides a Google Drive-like experience with tabbed navigation, multiple view modes, and sophisticated visual indicators for different file states.

## Architecture & Directory Structure

```
src/app/my-account/
├── page.tsx                    # Entry point - renders MyAccount with MYNETWORKS tab
├── loading.tsx                 # Loading UI
├── error.tsx                   # Error boundary
└── _components/                # Feature-specific components
    ├── MyAccount.tsx           # Main container component
    ├── SideBar.tsx            # Navigation sidebar
    ├── SelectionToolbarAndFilters.tsx  # Bulk actions and filters
    ├── FileRenderer.tsx        # File/folder rendering logic
    ├── ActionDropdown.tsx      # Context menu for individual items
    └── [Various Dialog Components] # Modal dialogs for actions

src/components/shared/          # Shared components used by My Account
├── NetworksList.tsx           # Network items display component
├── FoldersList.tsx           # Folder items display component
├── table-styles.ts           # Shared styling utilities
└── table-utils.ts            # Shared utility functions

src/components/ui/
├── ItemIcon.tsx          # Universal icon component for all NDEx file types
└── dialog.tsx                # Base dialog components

src/components/dialogs/
└── NetworkStatusDialog.tsx   # Warning/error display dialog
```

## Tab System & State Management

### Tab Types
```typescript
enum MyAccountTabType {
  MYNETWORKS = 'MYNETWORKS',    // User's own networks and folders
  SHARED = 'SHARED',            // Networks shared with user
  TRASH = 'TRASH'               # Deleted items
}
```

### State Architecture
The `MyAccount` component uses a centralized state management approach:

- **UI State**: View mode, selection, sidebar collapse, details panel
- **Data State**: Managed by custom hooks (`useFolderContents`, `useSharedFiles`, `useTrash`)
- **Dialog State**: Controlled by `DialogProvider` context
- **Filter State**: Search, sorting, and filtering options

## Icon System Specification

### Icon Priority Logic (Highest to Lowest)

The `ItemIcon` component is the universal icon renderer for all NDEx file types (networks, folders, shortcuts). It implements a priority-based system for determining which icon to display:

#### 1. **Invalid Networks** (Highest Priority)
- **Condition**: `isValid === false`
- **Icon**: `Hourglass` (gray/muted color)
- **Purpose**: Indicates incomplete or corrupted network data

#### 2. **Error State** (Second Priority)
- **Condition**: `hasError === true` (when `errorMessage` attribute exists and is non-empty)
- **Icon**: `XCircle` (red - `text-red-500`)
- **Behavior**: Clickable, opens `NetworkStatusDialog` with error details
- **Purpose**: Critical data validation errors

#### 3. **Warning State** (Third Priority)
- **Condition**: `hasWarnings === true` (when `warnings` array has length > 0)
- **Icon**: `TriangleAlert` (yellow - `text-yellow-500`)
- **Behavior**: Clickable, opens `NetworkStatusDialog` with warning list
- **Purpose**: Data validation warnings

#### 4. **Shared State** (Fourth Priority)
- **Networks**: `FileUser` icon (blue - `text-sky-700`)
- **Folders**: `Folder` with small `Users` overlay in center (blue overlay - `text-blue-500`)
- **Purpose**: Indicates item is shared with others

#### 5. **Default State** (Lowest Priority)
- **Networks**: `File` icon (blue - `text-sky-700`)
- **Folders**: `Folder` icon (muted - `text-muted-foreground`)

### Shortcut Icons
Shortcuts use distinct green-colored icons to differentiate from originals:
- **Network Shortcuts**: `FileSymlink` (green - `text-green-600`)
- **Folder Shortcuts**: `FolderSymlink` (green - `text-green-600`)

### Helper Functions for Icon Logic
```typescript
// Network attribute checking
const hasValidDOI = (network: FileItemBase): boolean => {
  const doi = (network as any).doi
  return doi && typeof doi === 'string' && !doi.toLowerCase().startsWith('pending')
}

const isReadOnlyNetwork = (network: FileItemBase): boolean => {
  return Boolean((network as any).isReadOnly)
}

const isSharedNetwork = (network: FileItemBase): boolean => {
  return Boolean((network as any).isShared)
}

const isNetworkValid = (network: FileItemBase): boolean => {
  const isValid = (network as any).isValid
  return isValid !== false
}

const hasNetworkWarnings = (network: FileItemBase): boolean => {
  const warnings = (network as any).warnings
  return warnings && Array.isArray(warnings) && warnings.length > 0
}

const hasNetworkError = (network: FileItemBase): boolean => {
  const errorMessage = (network as any).errorMessage
  return errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== ''
}
```

## Component Architecture Details

### MyAccount (Main Container)
**Location**: `src/app/my-account/_components/MyAccount.tsx`

**Responsibilities**:
- Tab state management and routing
- Authentication guard
- Data fetching coordination
- Selection management
- Drag & Drop provider setup

**Key Features**:
- Supports folder navigation with UUID-based routing
- Conditional hook initialization based on active tab
- Bulk operations coordination
- Toast notification integration

### NetworksList Component
**Location**: `src/components/shared/NetworksList.tsx`

**Architecture**:
```
NetworksList
├── GridNetworkItem    # Individual network cards in grid view
├── ListNetworkItem    # Table rows in list view
└── NetworkStatusDialog # Warning/error popup dialogs
```

**Key Features**:
- Dual view modes (grid/list) with consistent functionality
- Priority-based icon system integration
- Click handlers for warning/error icons
- Drag & drop support
- Sorting and selection
- Context menu integration

**Props Interface**:
```typescript
interface NetworksListProps {
  items: FileItemBase[]
  tabState?: MyAccountTabType
  viewMode: 'grid' | 'list'
  readOnly?: boolean
  showOwnerColumn?: boolean
  showVisibilityColumn?: boolean
  selectedItems?: string[]
  onSelect?: (event, id, index, type, sortedItems) => void
  onDropdownToggle?: (event, id, type) => void
  onRemoveShortcut?: (shortcutId: string) => Promise<void>
  defaultSort?: { field: 'name' | 'modificationTime', direction: 'asc' | 'desc' }
}
```

### FoldersList Component
**Location**: `src/components/shared/FoldersList.tsx`

Similar architecture to NetworksList but optimized for folder-specific operations and navigation.

## Dialog System

### NetworkStatusDialog
**Location**: `src/components/dialogs/NetworkStatusDialog.tsx`

**Purpose**: Display network data warnings and errors with proper accessibility

**Features**:
- Supports both warning and error modes
- Dynamic icon and color based on type
- Proper ARIA labeling with `DialogDescription`
- Prevents HTML nesting issues (no `<div>` in `<p>`)

**Usage Pattern**:
```typescript
const [dialogState, setDialogState] = useState({
  isOpen: false,
  type: 'warning' | 'error',
  title: string,
  content: string[]
})

// Click handlers
const handleWarningClick = (network: FileItemBase) => {
  const warnings = (network as any).warnings
  setDialogState({
    isOpen: true,
    type: 'warning',
    title: 'Network Data Warnings',
    content: warnings
  })
}
```

## View Modes & Styling

### Grid View
- Responsive CSS Grid layout
- Card-based presentation
- Optimal for visual browsing
- Defined in `tableStyles.grid`

### List View
- Table-based layout with fixed column widths
- Sortable columns
- Higher information density
- Enhanced selection visual feedback

### Selection Highlighting
Both view modes support enhanced selection styling:
- **Selected State**: Blue background (`bg-blue-100 dark:bg-blue-900/50`) with blue left border
- **Hover State**: Accent background with smooth transitions
- **Dragging State**: Reduced opacity for visual feedback

## Data Handling Patterns

### API Integration
- Uses custom hooks for data fetching (`useFolderContents`, `useSharedFiles`, `useTrash`)
- SWR for caching and revalidation
- Optimistic updates for better UX

### Attribute Access Pattern
Network and folder attributes are accessed using type assertion:
```typescript
const attribute = (item as any).attributeName
```

Common attributes checked:
- `doi`: DOI identifier
- `isReadOnly`: Read-only status
- `isShared`: Sharing status
- `isValid`: Data validation status
- `warnings`: Array of validation warnings
- `errorMessage`: Critical error message

### Drag & Drop Implementation
- React DnD with HTML5 backend
- Supports network/folder movement between folders
- Visual feedback during drag operations
- Respects read-only restrictions

## UI/UX Features

### Responsive Design
- Mobile-first approach
- Collapsible sidebar for small screens
- Responsive grid layouts
- Touch-friendly interactions

### Accessibility
- Proper ARIA labeling
- Keyboard navigation support
- Screen reader compatible
- Color contrast compliance
- Focus management in dialogs

### Performance Considerations
- Virtualization for large lists (react-virtual)
- Memoized components and callbacks
- Efficient re-rendering with React.memo
- Debounced search and filter operations

## Integration Points

### Authentication
- Keycloak integration via `useAuth` hook
- Token-based API authentication
- Route protection for unauthenticated users

### Configuration
- Dynamic base path support
- Environment-specific API endpoints
- UI content configuration

### Toast Notifications
- Centralized notification system
- Success/error feedback for operations
- Auto-dismiss with configurable timing

## Development Guidelines

### Adding New Icons
1. Update `ItemIcon` component with new condition
2. Follow priority order (higher priority = earlier in conditional chain)
3. Add corresponding helper function for attribute checking
4. Update prop interfaces if new click handlers needed

### Adding New Dialogs
1. Create component in `src/components/dialogs/`
2. Use shadcn/ui dialog components as base
3. Ensure proper accessibility with `DialogDescription`
4. Integrate with `DialogProvider` context if needed

### Extending View Modes
1. Update `tableStyles` configuration
2. Add new view mode to type definitions
3. Implement rendering logic in list components
4. Update responsive breakpoints as needed

## Testing Considerations

### Key Test Scenarios
- Icon priority logic with various attribute combinations
- Dialog accessibility and proper ARIA labeling
- Drag & drop functionality across folders
- Selection behavior with keyboard shortcuts
- Responsive layout at different breakpoints
- Error handling for malformed network data

### Mock Data Requirements
Network objects should include:
```typescript
{
  uuid: string
  name: string
  type: NDExFileType
  // Status attributes
  isValid?: boolean
  isReadOnly?: boolean
  isShared?: boolean
  doi?: string
  warnings?: string[]
  errorMessage?: string
}
```

This documentation should serve as a comprehensive guide for developers maintaining or extending the My Account page functionality.