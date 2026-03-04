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
├── DetailsPanel.tsx          # Resizable item details panel
├── table-styles.ts           # Shared styling utilities
└── table-utils.ts            # Shared utility functions

src/hooks/                     # Custom React hooks
├── useResizablePanel.ts      # Hook for managing panel width with persistence
└── [other hooks]             # Data fetching and state management hooks

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
- **Resizable Panel State**: Managed by `useResizablePanel` hook for persistent width preferences

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
  showPermissionColumn?: boolean  // New in v2: Shows READ/EDIT permissions
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

## Resizable Details Panel System

### Overview
The Details Panel is a resizable side panel that displays comprehensive information about selected networks, folders, and shortcuts. It provides an enhanced user experience on wide screens by allowing users to adjust the panel width to view detailed metadata without scrolling.

**Universal Application**: This feature is available across all network list interfaces in the application:
- **My Account Page** (`/my-account`): My Networks, Shared with Me, and Trash tabs
- **User Public Pages** (`/users/[username]`): Public user content browsing
- **Folder Navigation Pages**: When browsing folder contents
- **Future Network List Pages**: Any new pages that implement network/folder listing will inherit this functionality

### Architecture

#### DetailsPanel Component
**Location**: `src/components/shared/DetailsPanel.tsx`

**Key Features**:
- **Dynamic Width**: Panel width controlled via inline styles, not fixed CSS classes
- **Drag-to-Resize**: Interactive resize handle with visual feedback
- **Type-Specific Content**: Displays different information based on item type (Network/Folder/Shortcut)
- **Loading States**: Proper loading indicators during API data fetching
- **Error Handling**: Graceful error states with user-friendly messaging

**Props Interface**:
```typescript
interface DetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: string[]
  allItems: FileItemBase[]
  width?: number                    // Dynamic panel width
  isDragging?: boolean             // Visual feedback during resize
  onMouseDownResize?: (e: React.MouseEvent) => void  // Resize handle event
}
```

#### useResizablePanel Hook
**Location**: `src/hooks/useResizablePanel.ts`

**Purpose**: Manages panel width state with localStorage persistence and smart constraints.

**Configuration Options**:
```typescript
interface UseResizablePanelOptions {
  defaultWidth?: number       // Initial width (default: 320px)
  minWidth?: number          // Minimum allowed width (default: 280px)
  maxWidthPercent?: number   // Maximum as viewport percentage (default: 0.6)
  storageKey?: string        // localStorage key for persistence
}
```

**Returns**:
```typescript
interface UseResizablePanelReturn {
  width: number                                    // Current panel width
  setWidth: (width: number) => void               // Update width with constraints
  isDragging: boolean                             // Drag state for visual feedback
  handleMouseDown: (e: React.MouseEvent) => void  // Resize handle event handler
}
```

### Implementation Pattern

#### Parent Component Integration
Each page that uses the DetailsPanel follows this pattern:

```typescript
// 1. Import the hook
import { useResizablePanel } from '@/hooks/useResizablePanel'

// 2. Initialize with page-specific storage key
const { width: panelWidth, isDragging, handleMouseDown } = useResizablePanel({
  defaultWidth: 320,
  minWidth: 280,
  maxWidthPercent: 0.6,
  storageKey: 'detailsPanel.myAccount.width'  // Page-specific key
})

// 3. Pass to DetailsPanel component
<DetailsPanel
  isOpen={detailsOpen}
  onClose={() => setDetailsOpen(false)}
  selectedItems={selectedItems}
  allItems={displayItems}
  width={panelWidth}
  isDragging={isDragging}
  onMouseDownResize={handleMouseDown}
/>
```

### Storage Strategy

#### Page-Specific Persistence
Each page type maintains its own width preference:

```typescript
// My Account pages
'detailsPanel.myAccount.width'

// User public pages
'detailsPanel.userPublic.width'

// Future pages would follow the pattern
'detailsPanel.[pageType].width'
```

#### Cross-Session Behavior
- **Initial Load**: Panel opens at saved width or default (320px)
- **Resize Actions**: Width immediately saved to localStorage
- **Cross-Tab**: Each browser tab can have independent widths during session
- **App Restart**: Previous width preference restored automatically

#### Responsive Constraints
```typescript
// Automatic constraint application
const maxWidth = Math.floor(window.innerWidth * 0.6)  // 60% of viewport
const constrainedWidth = Math.max(280, Math.min(savedWidth, maxWidth))
```

### User Experience

#### Resize Interaction
1. **Hover State**: Resize handle shows grip icon (`GripVertical`) and changes cursor to `col-resize`
2. **Active Drag**: Handle highlights, cursor changes globally, text selection disabled
3. **Visual Feedback**: Smooth transitions and immediate width updates during drag
4. **Constraints**: Real-time enforcement of min/max width limits

#### Responsive Behavior
- **Wide Screens**: Users can expand panel significantly for detailed content viewing
- **Narrow Screens**: Panel automatically constrains to maximum 60% of viewport width
- **Window Resize**: Panel width adjusts if current width exceeds new maximum
- **Mobile**: Panel behavior optimized for touch interactions

### Content Display

#### Network Details
When a single network is selected, displays:
- **Metadata**: Node count, edge count, visibility, owner, version
- **Timestamps**: Creation and modification dates
- **Status Indicators**: Layout availability, certification status
- **Description**: Full HTML description with proper rendering
- **UUID**: Technical identifier for debugging

#### Folder Details
When a single folder is selected, displays:
- **Hierarchy**: Parent folder information
- **Timestamps**: Modification date
- **Metadata**: Updated by user information
- **UUID**: Technical identifier

#### Shortcut Details
When a single shortcut is selected, displays:
- **Target Information**: UUID of linked item
- **Hierarchy**: Parent folder location
- **Timestamps**: Modification date
- **Type**: Clear indication this is a shortcut reference

#### Multiple Selection
When multiple items are selected:
- **Count Display**: "X items selected"
- **Item List**: Scrollable list of selected items with icons
- **Mixed Type Support**: Handles combinations of networks, folders, shortcuts

### Technical Implementation Details

#### Resize Handle Design
```typescript
// Visual design with accessibility
<div
  className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize
    bg-transparent hover:bg-accent/50 transition-colors
    flex items-center justify-center group
    ${isDragging ? 'bg-accent' : ''}`}
  onMouseDown={onMouseDownResize}
>
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    <GripVertical className="h-4 w-4 text-muted-foreground" />
  </div>
</div>
```

#### Event Handling
```typescript
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  setIsDragging(true)

  const startX = e.clientX
  const startWidth = width

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = startX - e.clientX  // Left-to-right drag increases width
    const newWidth = startWidth + deltaX
    setWidth(newWidth)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    // Cleanup event listeners and global styles
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // Global drag handling
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}, [width, setWidth])
```

### Performance Considerations

#### Optimizations
- **Event Cleanup**: Proper removal of global mouse event listeners
- **Debounced Storage**: localStorage updates are throttled during rapid resize
- **Constrained Calculations**: Min/max width calculations cached until window resize
- **Selective Re-renders**: Only affected components re-render during width changes

#### Memory Management
- **Listener Cleanup**: All event listeners properly removed on component unmount
- **Reference Stability**: useCallback ensures stable function references
- **State Isolation**: Each page's panel state is completely independent

### Accessibility Features

#### Keyboard Support
- **Tab Navigation**: Resize handle can be focused via keyboard
- **Escape Key**: Cancels active resize operation
- **Screen Readers**: Proper ARIA labeling for resize functionality

#### Visual Indicators
- **Focus States**: Clear focus indicators for keyboard navigation
- **High Contrast**: Works properly with high contrast mode
- **Color Independence**: Functionality doesn't rely solely on color changes

### Integration Guidelines

#### Adding to New Pages
To add resizable details panel to a new page:

1. **Import Hook**: `import { useResizablePanel } from '@/hooks/useResizablePanel'`
2. **Initialize**: Use unique storage key for the page type
3. **Layout**: Ensure parent container uses flexbox for proper panel integration
4. **Props**: Pass width, isDragging, and handleMouseDown to DetailsPanel
5. **Testing**: Verify resize behavior across different screen sizes

#### Best Practices
- **Storage Keys**: Use descriptive, page-specific keys to avoid conflicts
- **Default Width**: 320px provides good balance between content and main area
- **Maximum Width**: 60% of viewport prevents panel from dominating interface
- **Minimum Width**: 280px ensures panel remains functional at smallest size

### Future Extensibility

#### Planned Enhancements
- **Keyboard Resize**: Arrow key support for accessibility
- **Preset Widths**: Quick-select buttons for common widths
- **Panel Collapse**: Minimize to icon while preserving width preference
- **Multiple Panels**: Framework supports additional resizable panels

#### Compatibility
The resizable panel system is designed to be:
- **Framework Agnostic**: Core logic can be adapted to other frameworks
- **Theme Compatible**: Works seamlessly with light/dark mode switching
- **Export Safe**: Compatible with Next.js static export requirements
- **Mobile Responsive**: Adapts automatically to different screen sizes

This resizable details panel system significantly enhances the user experience for viewing detailed network and folder information, particularly on wide screens where users can dedicate more space to metadata viewing without sacrificing the main content area.

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

### NDEx Client v2 API Migration

#### Attribute Structure Changes
Starting with NDEx Client v2, several commonly used attributes have been moved from the nested `attributes` object to top-level properties in `FileItemBase`:

**Top-Level Attributes (v2)**:
```typescript
interface FileItemBase {
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date | number

  // Moved to top-level in v2
  owner?: string          // Previously: item.attributes.owner
  ownerUUID?: string      // Previously: Not available
  visibility?: string     // Previously: item.attributes.visibility
  updatedBy?: string      // Previously: item.attributes.updatedBy
  edges?: number          // Previously: item.attributes.edges
  permission?: Permission // New in v2: User's permission level (READ/WRITE)

  attributes: {
    [key: string]: any
    // Shortcut-specific attributes remain nested
    target_status?: ShortcutTargetStatus
    target_type?: NDExFileType
  }
}
```

**Migration Notes**:
- ✅ All code updated to access attributes from top-level
- ✅ `permission` attribute provides user's access level for shared items
- ✅ `owner` and `ownerUUID` available for ownership checks
- ✅ `edges` attribute no longer nested in attributes object

#### Legacy Attribute Access Pattern
For attributes still accessed from the nested object, use type assertion:
```typescript
const attribute = (item as any).attributeName
```

Common attributes still checked:
- `doi`: DOI identifier
- `isReadOnly`: Read-only status
- `isShared`: Sharing status
- `isValid`: Data validation status
- `warnings`: Array of validation warnings
- `errorMessage`: Critical error message
- `target_status`: Shortcut target status (for shortcuts)
- `target_type`: Shortcut target type (for shortcuts)

### Drag & Drop Implementation
- React DnD with HTML5 backend
- Supports network/folder movement between folders
- Visual feedback during drag operations
- Respects read-only restrictions

## Table Columns & Display Logic

### Column Visibility Rules

The NetworksList and FoldersList components support conditional column display based on the current context:

#### Owner Column
- **Displayed in**:
  - "Shared with me" tab (always shown)
  - Folder navigation pages (`/folders/<uuid>`)
- **Hidden in**:
  - "My networks" tab
  - Trash tab
- **Data Source**: `item.owner` (username of the file owner)
- **Alignment**: Left-aligned for better readability

#### Permission Column
- **Displayed in**:
  - "Shared with me" tab only
- **Hidden in**: All other contexts
- **Data Source**: `item.permission` (Permission enum: READ or WRITE)
- **Display Format**:
  - `Permission.WRITE` → "EDIT"
  - `Permission.READ` → "READ"
  - No permission → "READ" (default)
- **Purpose**: Shows the current user's access level for shared items
- **Alignment**: Center-aligned

#### Visibility Column
- **Displayed in**: All tabs and contexts (default)
- **Can be hidden**: Via `showVisibilityColumn={false}` prop
- **Data Source**: `item.visibility`
- **Display Format**: Badge with color coding:
  - PUBLIC: Green background (`bg-green-200 dark:bg-green-700/80`)
  - UNLISTED: Purple background (`bg-purple-100 dark:bg-purple-900`)
  - PRIVATE: Blue background (`bg-blue-300 dark:bg-blue-700/70`)
- **Alignment**: Center-aligned

### Permission-Based Action Restrictions

#### Shared With Me Tab Restrictions

When viewing items in the "Shared with me" tab, the ActionDropdown menu applies these restrictions based on user permissions and ownership:

**Edit Properties Button**:
- **Disabled when**:
  - User has READ permission only (not WRITE)
  - Network has a DOI
  - Network is read-only
- **Visual State**: Greyed out with disabled cursor
- **Implementation**:
  ```typescript
  const shouldDisableEditProperties =
    hasDOI ||
    isReadOnly ||
    (tabState === MyAccountTabType.SHARED && !hasWritePermission)
  ```

**Move to Trash Button**:
- **Hidden when**: Current user is not the owner of the item
- **Displayed when**: Current user is the owner (even in shared tab)
- **Rationale**: Only file owners should be able to delete files
- **Implementation**:
  ```typescript
  const isOwner = item?.owner === user?.userName
  const shouldHideMoveToTrash = tabState === MyAccountTabType.SHARED && !isOwner
  ```

**Other Actions**: Share, Download, Make a Copy remain available regardless of permission level

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
Network and folder objects should include:
```typescript
{
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date | number

  // Top-level attributes (v2 structure)
  owner?: string
  ownerUUID?: string
  visibility?: string        // 'PUBLIC' | 'PRIVATE' | 'UNLISTED'
  updatedBy?: string
  edges?: number
  permission?: Permission    // For shared items: Permission.READ | Permission.WRITE

  attributes: {
    // Status attributes (still nested)
    isValid?: boolean
    isReadOnly?: boolean
    isShared?: boolean
    doi?: string
    warnings?: string[]
    errorMessage?: string

    // Shortcut attributes
    target_status?: 'ACTIVE' | 'IN_TRASH' | 'DELETED'
    target_type?: NDExFileType
  }
}
```

This documentation should serve as a comprehensive guide for developers maintaining or extending the My Account page functionality.