# Move Files Feature - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Architecture & Design](#architecture--design)
4. [Technical Specification](#technical-specification)
5. [Implementation](#implementation)
6. [Post-Implementation Changes](#post-implementation-changes)
7. [API Reference](#api-reference)
8. [Testing](#testing)

---

## 1. Overview

### Purpose
The Move Files feature enables users to relocate files (folders, networks, and shortcuts) within their NDEx workspace using a Google Drive-style interface. The feature supports both drag-and-drop and dialog-based move operations.

### Key Features
- **Multiple file types**: Supports folders, networks, and shortcuts
- **Dual interaction modes**: Drag-and-drop and dialog-based moves
- **Google Drive-style UX**: Familiar navigation patterns with "All Locations" view
- **Shared logic architecture**: Single source of truth for move operations
- **Dark mode support**: Full dark mode compatibility
- **Home folder navigation**: Support for moving files to/from home folder

### Trigger Points
1. **ActionDropdown**: "Move" menu item for single file operations
2. **SelectionToolbar**: Move icon for batch operations (multiple files)
3. **Drag-and-drop**: Direct file movement between folders

---

## 2. Requirements

### 2.1 Functional Requirements

#### Supported File Types
- **Folders**: Move folder to another folder or home directory
- **Networks**: Move network to folder or home directory
- **Shortcuts**: Move shortcut while preserving target reference

#### User Interface Requirements

**Initial State: "All Locations" View**
```
┌─────────────────────────────────────────────────┐
│ Move "My Research" (or "Move 5 items")     [X] │
├─────────────────────────────────────────────────┤
│ Current location: My Drive                      │
│ [Reserved empty row for navigation]             │
├─────────────────────────────────────────────────┤
│ 📁 My Drive                             [>]    │
│ 👥 Shared with me                       [>]    │
├─────────────────────────────────────────────────┤
│               [Cancel]  [Move (disabled)]       │
└─────────────────────────────────────────────────┘
```

**After Navigating into Folder**
```
┌─────────────────────────────────────────────────┐
│ Move "My Research"                         [X]  │
├─────────────────────────────────────────────────┤
│ Current location: My Drive                      │
│ ← Research Projects                             │
├─────────────────────────────────────────────────┤
│ 📁 Data Analysis            [Move]  [>]        │
│ 📁 Literature Review        [Move]  [>]        │
├─────────────────────────────────────────────────┤
│               [Cancel]  [Move (enabled)]        │
└─────────────────────────────────────────────────┘
```

#### Interaction Patterns

**Single-click folder**:
- Highlight folder (blue background)
- Set as target folder
- Enable Move button
- Do NOT navigate or change view

**Double-click folder**:
- Navigate into folder
- Display "← Folder Name" in navigation row
- Show subfolders
- Set as target and enable Move button

**Hover over folder**:
- Highlight row (grey background)
- Show "Move" button (quick move and close)
- Show ">" icon (same as double-click)

**Click back arrow (←)**:
- Navigate to parent folder
- Update folder list
- Clear selection

**Special Cases**:
- **"Shared with me"**: Can navigate into but cannot select as target
- **"My Drive"**: Can select as target only when in a subfolder
- **Current folder**: Cannot select as target

### 2.2 Validation Requirements

#### Move Restrictions
- ❌ Cannot move to same folder
- ❌ Cannot move folder into itself
- ❌ Cannot move to "Shared with me" root
- ❌ Cannot move folder into its descendant (circular reference)
- ✅ Can move to home folder ("My Drive") when in subfolder
- ✅ Can move into folders under "Shared with me"

---

## 3. Architecture & Design

### 3.1 Design Principles

1. **Single Source of Truth**: Shared move logic in reusable hook
2. **Separation of Concerns**: UI logic separated from business logic
3. **Type Safety**: Full TypeScript typing throughout
4. **Reusability**: Components and hooks designed for reuse
5. **Maintainability**: Clear structure with documented code

### 3.2 Component Architecture

```
┌─────────────────────────────────────────────────┐
│                  DialogContext                   │
│         (Global dialog state management)         │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼────────────┐
│ ActionDropdown│ │SelectionBar│ │  MyAccount.tsx    │
│               │ │            │ │  (drag-and-drop)  │
└───────┬──────┘ └──────┬─────┘ └──────┬────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
            ┌───────────▼───────────┐
            │  MoveFolderDialog     │
            │  (Google Drive UI)    │
            └───────────┬───────────┘
                        │
            ┌───────────▼───────────────┐
            │  useFileMoveOperation     │
            │  (Shared move logic)      │
            └───────────┬───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼──────┐
│  useFolder   │ │ useNetwork │ │ useShortcut │
│  updateFolder│ │ moveNetworks│ │updateShortcut│
└──────────────┘ └────────────┘ └─────────────┘
```

### 3.3 Data Flow

```
User Action (Dialog/Drag-Drop)
        ↓
useFileMoveOperation.moveFiles()
        ↓
Validation (same folder, circular ref, etc.)
        ↓
Group by type: folders, networks, shortcuts
        ↓
        ├─→ Folders: updateFolder() individually
        ├─→ Networks: moveNetworks() batch
        └─→ Shortcuts: fetch details → updateShortcut()
        ↓
Update local state (SWR cache invalidation)
        ↓
Trigger callbacks (refresh, clear selection)
        ↓
Show success/error feedback
```

---

## 4. Technical Specification

### 4.1 Core Hook: `useFileMoveOperation`

**Location**: `src/hooks/use-file-move-operation.ts`

**Interface**:
```typescript
export interface MoveOperationResult {
  success: boolean
  movedCount: number
  failedCount: number
  errors: string[]
}

export interface UseFileMoveOperationReturn {
  moveFiles: (itemIds: string[], targetFolderId: string | null) => Promise<MoveOperationResult>
  isMoving: boolean
  error: Error | null
}

export const useFileMoveOperation = (
  currentFolderId: string | null,
  displayItems: FileItemBase[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
): UseFileMoveOperationReturn
```

**Key Responsibilities**:
- Validate move operations
- Handle folders, networks, shortcuts differently
- Batch network moves for performance
- Fetch shortcut details before moving
- Invalidate SWR cache
- Execute success/error callbacks

### 4.2 Dialog Component: `MoveFolderDialog`

**Location**: `src/app/my-account/_components/MoveFolderDialog.tsx`

**Props Interface**:
```typescript
interface MoveFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  itemsToMove: string[]
  itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>
  currentFolderId: string | null
  currentFolderName?: string
  onMoveComplete: () => Promise<void>
}
```

**State Management**:
```typescript
type ViewMode = 'all' | 'myDrive' | 'shared'

const [viewMode, setViewMode] = useState<ViewMode>('all')
const [browseFolderId, setBrowseFolderId] = useState<string | null>(null)
const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([])
const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
```

**Sub-components**:
- `LocationItem`: Renders "My Drive" and "Shared with me" with selection support
- `FolderItem`: Renders individual folders with dual highlight states

### 4.3 Integration Points

#### DialogContext
**Location**: `src/lib/contexts/DialogContext.tsx`

```typescript
interface DialogContextType {
  openMoveFolderDialog: (
    itemsToMove: string[],
    itemDataMap: Record<string, { name: string; type: NDExFileType; visibility?: string }>,
    currentFolderId: string | null,
    currentFolderName: string | undefined,
    onMoveComplete: () => Promise<void>,
  ) => void
  // ... other dialog methods
}
```

#### ActionDropdown
**Location**: `src/app/my-account/_components/ActionDropdown.tsx`

```typescript
interface ActionDropdownProps {
  currentFolderId: string | null
  currentFolderName?: string
  onRefreshFolder?: () => Promise<void>
  onClearSelection?: () => void
  // ... other props
}
```

#### SelectionToolbar
**Location**: `src/app/my-account/_components/SelectionToolbarAndFilters.tsx`

Similar interface to ActionDropdown for consistency.

---

## 5. Implementation

### 5.1 Key Implementation Points

#### 1. Shared Move Logic Extraction

**Problem**: Move logic was duplicated between drag-and-drop (MyAccount.tsx) and the move dialog.

**Solution**: Extracted to `useFileMoveOperation` hook:
- Reduced MyAccount.tsx `handleMoveItems` from 130 lines to 35 lines
- Single source of truth for validation and move operations
- Reusable across all move trigger points

**Location**: `src/hooks/use-file-move-operation.ts`

#### 2. Type-Specific Move Handling

**Folders**:
```typescript
await updateFolder(item.uuid, {
  name: item.name,
  description: (item as any).description || '',
  parent: targetFolderId || undefined  // undefined = home folder
})
```

**Networks** (batch operation):
```typescript
// Collect all network IDs
const networksToMove = items
  .filter(item => item.type === NDExFileType.NETWORK)
  .map(item => item.uuid)

// Move in single API call
await moveNetworks(networksToMove, targetFolderId)
```

**Shortcuts** (requires fetching details):
```typescript
// CRITICAL: Fetch shortcut details first
const ndexClient = getNdexClient(config.ndexBaseUrl, token)
const shortcutData = await ndexClient.files.getShortcut(item.uuid)

// Then move with complete data
await updateShortcut(item.uuid, {
  name: item.name,
  target: shortcutData.target,           // From fetched data
  targetType: shortcutData.targetType,   // From fetched data
  parent: targetFolderId || undefined
})
```

**Why shortcut fetch is needed**: The `displayItems` array doesn't include `target` and `targetType` which are required by the API.

#### 3. Home Folder Navigation

**Challenge**: Allow moving files to home folder ("My Drive") from subfolders.

**Solution**: Special handling for 'myDrive' identifier:

```typescript
// Validation
const isValidTarget = (targetId: string | null): boolean => {
  if (!targetId) return false
  if (targetId === 'shared') return false
  // Allow 'myDrive' only when in subfolder
  if (targetId === 'myDrive') return currentFolderId !== null
  if (targetId === currentFolderId) return false
  if (itemsToMove.includes(targetId)) return false
  return true
}

// Conversion before API call
const handleMove = async () => {
  if (selectedTargetId && isValidTarget(selectedTargetId)) {
    // Convert 'myDrive' to null for API
    const actualTargetId = selectedTargetId === 'myDrive' ? null : selectedTargetId
    await moveFiles(itemsToMove, actualTargetId)
  }
}
```

**API Handling**:
- `null` or `undefined` = home folder
- APIs updated to accept `string | null` for targetFolderId

#### 4. Dual Interaction Modes

**Single-click selection**:
```typescript
const handleFolderSingleClick = (folderId: string, folderName: string) => {
  setSelectedTargetId(folderId)
  // Don't navigate, don't change view
}
```

**Double-click navigation**:
```typescript
const handleFolderDoubleClick = (folderId: string, folderName: string) => {
  setBrowseFolderId(folderId)
  setNavigationStack([...navigationStack, { id: folderId, name: folderName }])
  setSelectedTargetId(folderId)  // Also set as target
}
```

**Visual feedback**:
- Selected folder: Blue background (`bg-blue-50`, `border-blue-500`)
- Hovered folder: Grey background (`hover:bg-gray-50`)
- Both states can coexist

#### 5. Display Items Construction

**Problem**: Items to move weren't available in `displayItems` array when dialog opened.

**Solution**: Merge items from multiple sources:

```typescript
const displayItems = useMemo(() => {
  const items = [...myDriveFolders, ...sharedItems]

  // Add items being moved if not already in the list
  itemsToMove.forEach(itemId => {
    if (!items.find(item => item.uuid === itemId) && itemDataMap[itemId]) {
      const itemData = itemDataMap[itemId]
      items.push({
        uuid: itemId,
        name: itemData.name,
        type: itemData.type,
        attributes: { visibility: itemData.visibility }
      } as any)
    }
  })

  return items
}, [myDriveFolders, sharedItems, itemsToMove, itemDataMap])
```

#### 6. Dark Mode Implementation

All components support dark mode using Tailwind's `dark:` variant:

```typescript
<div className="bg-white dark:bg-gray-900">
  <h2 className="text-gray-900 dark:text-gray-100">Title</h2>
  <p className="text-gray-500 dark:text-gray-400">Description</p>
  <div className="border-gray-200 dark:border-gray-700">
    <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
      Move
    </button>
  </div>
</div>
```

### 5.2 File Structure

```
src/
├── hooks/
│   └── use-file-move-operation.ts         # Shared move logic hook
├── app/my-account/_components/
│   ├── MoveFolderDialog.tsx               # Main dialog component
│   ├── MyAccount.tsx                      # Uses hook for drag-drop
│   ├── ActionDropdown.tsx                 # Trigger point for single item
│   └── SelectionToolbarAndFilters.tsx     # Trigger point for batch
└── lib/contexts/
    └── DialogContext.tsx                  # Dialog state management
```

---

## 6. Post-Implementation Changes

### 6.1 Change Log

| # | Issue | Solution | Files Modified |
|---|-------|----------|----------------|
| 1 | No dark mode support | Added `dark:` Tailwind variants to all elements | `MoveFolderDialog.tsx` |
| 2 | Can't move to home folder | Allow 'myDrive' selection when in subfolder, convert to null for API | `MoveFolderDialog.tsx`, `use-file-move-operation.ts`, `use-folder.ts`, `use-network-operation.ts`, NDEx client |
| 3 | Shows "Current Folder" placeholder | Pass actual folder name through component chain | `MoveFolderDialog.tsx`, `MyAccount.tsx`, `ActionDropdown.tsx`, `SelectionToolbarAndFilters.tsx`, `DialogContext.tsx` |
| 4 | Folder doesn't refresh after move | Add `onRefreshFolder` callback | `MyAccount.tsx`, `ActionDropdown.tsx`, `SelectionToolbarAndFilters.tsx` |
| 5 | Selection not cleared after move | Add `onClearSelection` callback | `MyAccount.tsx`, `ActionDropdown.tsx`, `SelectionToolbarAndFilters.tsx` |
| 6 | Silent failures | Add error logging and user alerts | `use-file-move-operation.ts`, `MoveFolderDialog.tsx` |
| 7 | displayItems empty causing failures | Include items from itemDataMap in displayItems | `MoveFolderDialog.tsx` |
| 8 | Shortcut move missing target/targetType | Fetch shortcut details before moving | `use-file-move-operation.ts` |

### 6.2 Detailed Change Descriptions

#### Change #1: Dark Mode Support
Added comprehensive dark mode styling:
- Container backgrounds: `dark:bg-gray-900`
- Text colors: `dark:text-gray-100`, `dark:text-gray-400`
- Borders: `dark:border-gray-700`
- Interactive states: `dark:hover:bg-gray-800`
- Selection: `dark:bg-blue-900/30`, `dark:border-blue-400`

#### Change #2: Home Folder Support
**API Changes**:
```typescript
// use-file-move-operation.ts
moveFiles: (itemIds: string[], targetFolderId: string | null) => Promise<MoveOperationResult>

// use-network-operation.ts
moveNetworks: async (networkIds: string[], targetFolderId: string | null)

// NDEx Client - UnifiedNetworkService.ts
async moveNetworks(networkIds: string[], folderId?: string): Promise<any> {
  const data = {
    targetFolder: folderId !== undefined ? folderId : null,  // null = home
    networks: networkIds
  };
}
```

#### Change #3: Current Folder Name Display
**Component Chain**:
1. `MyAccount.tsx`: Fetch folder using `useFolder(folderId)`, pass `folder?.name`
2. `ActionDropdown.tsx`: Add `currentFolderName` prop, pass to dialog
3. `SelectionToolbar.tsx`: Add `currentFolderName` prop, pass to dialog
4. `DialogContext.tsx`: Add to interface and state
5. `MoveFolderDialog.tsx`: Display using `currentFolderName || 'Current Folder'`

#### Change #4 & #5: Post-Move Actions
```typescript
// MyAccount.tsx
<ActionDropdown
  onRefreshFolder={refreshFolderContents}
  onClearSelection={() => setSelectedItems([])}
  // ... other props
/>

// ActionDropdown.tsx
const handleOpenMoveDialog = () => {
  openMoveFolderDialog(
    [openDropdownId],
    itemDataMap,
    currentFolderId,
    currentFolderName,
    async () => {
      if (onRefreshFolder) await onRefreshFolder()
      if (onClearSelection) onClearSelection()
    }
  )
}
```

#### Change #8: Shortcut Move Fix
**Root Cause**: `item.attributes` didn't contain `target` and `targetType`

**Solution**:
```typescript
// Fetch complete shortcut data
const ndexClient = getNdexClient(config.ndexBaseUrl, token)
const shortcutData = await ndexClient.files.getShortcut(item.uuid)

// Use fetched data (not attributes)
await updateShortcut(item.uuid, {
  name: item.name,
  target: shortcutData.target,        // Direct property
  targetType: shortcutData.targetType, // Direct property
  parent: targetFolderId || undefined
})
```

**Shortcut Interface** (NDEx Client):
```typescript
export interface Shortcut {
  name: string;
  parent?: string;
  target: string;           // Direct property
  targetType: NDExFileType; // Direct property
}
```

---

## 7. API Reference

### 7.1 Network Operations

**Move Networks (Batch)**
```typescript
// Hook: use-network-operation.ts
const moveNetworks = async (
  networkIds: string[],
  targetFolderId: string | null
): Promise<any>

// NDEx Client: UnifiedNetworkService.ts
async moveNetworks(networkIds: string[], folderId?: string): Promise<any>
```

**Request Payload**:
```json
{
  "targetFolder": "folder-uuid" | null,
  "networks": ["network-uuid-1", "network-uuid-2"]
}
```

### 7.2 Folder Operations

**Update Folder**
```typescript
// Hook: use-folder.ts
const updateFolder = async (
  folderIdToUpdate: string,
  folderData: {
    name: string
    description: string
    parent?: string  // undefined = home folder
  }
): Promise<void>

// NDEx Client: FilesService.ts
async updateFolder(folderId: string, folderData: FolderUpdateRequest): Promise<Folder>
```

### 7.3 Shortcut Operations

**Get Shortcut**
```typescript
// NDEx Client: FilesService.ts
async getShortcut(shortcutId: string, accessKey?: string): Promise<Shortcut>
```

**Update Shortcut**
```typescript
// Hook: use-shortcut.ts
const updateShortcut = async (
  shortcutIdToUpdate: string,
  shortcutObject: {
    name: string
    target: string
    targetType: NDExFileType
    parent?: string
  }
): Promise<Shortcut>

// NDEx Client: FilesService.ts
async updateShortcut(shortcutId: string, shortcutData: ShortcutUpdateRequest): Promise<Shortcut>
```

### 7.4 Data Fetching

**Folder Contents**
```typescript
// Hook: use-folder.ts
const { items, refresh } = useFolderContents(folderId: string | null)
```

**Shared Files**
```typescript
// Hook: use-shared-files.ts
const { items } = useSharedFiles()
```

---

## 8. Testing

### 8.1 Validation Tests

**Move Restrictions**:
- [ ] Cannot move to same folder
- [ ] Cannot move folder into itself
- [ ] Cannot move to "Shared with me" root
- [ ] Cannot move folder into descendant (circular reference)
- [ ] Can move to home folder when in subfolder
- [ ] Can move into folders under "Shared with me"

### 8.2 Interaction Tests

**Dialog Navigation**:
- [ ] "All Locations" initial view shows My Drive and Shared with me
- [ ] Double-click navigates into folder
- [ ] Single-click selects folder without navigating
- [ ] Back arrow navigates to parent
- [ ] Hover shows Move button and > icon

**Visual Feedback**:
- [ ] Selected folder has blue background
- [ ] Hovered folder has grey background
- [ ] Move button disabled when no valid target selected
- [ ] Current location always displayed
- [ ] Dynamic dialog title shows item name(s)

### 8.3 Integration Tests

**Trigger Points**:
- [ ] ActionDropdown "Move" opens dialog for single file
- [ ] SelectionToolbar move icon opens dialog for multiple files
- [ ] Drag-and-drop still works using shared hook
- [ ] All trigger points use same validation logic

**Post-Move Actions**:
- [ ] Folder contents refresh after successful move
- [ ] Selection state clears after successful move
- [ ] Success toast appears with correct message
- [ ] Error handling shows appropriate messages

### 8.4 Type-Specific Tests

**Folders**:
- [ ] Move folder to another folder
- [ ] Move folder to home directory
- [ ] Move multiple folders

**Networks**:
- [ ] Move single network
- [ ] Batch move multiple networks
- [ ] Move network to home directory

**Shortcuts**:
- [ ] Move shortcut preserves target
- [ ] Move shortcut preserves targetType
- [ ] Move shortcut to home directory

**Mixed Operations**:
- [ ] Move folders, networks, shortcuts together
- [ ] Partial success handling (some succeed, some fail)

### 8.5 Dark Mode Tests

- [ ] Dialog visible in dark mode
- [ ] Text readable in dark mode
- [ ] Hover states visible in dark mode
- [ ] Selection states visible in dark mode
- [ ] Buttons styled correctly in dark mode

---

## Appendix: Benefits & Outcomes

### Maintainability
✅ **Single source of truth** for move logic (`useFileMoveOperation` hook)
✅ Drag-and-drop and dialog use identical logic
✅ Easy to extend (e.g., copy instead of move)
✅ Centralized validation logic

### Code Quality
✅ Clean separation of concerns
✅ Reusable components (`LocationItem`, `FolderItem`)
✅ Type-safe with TypeScript
✅ Follows React best practices (hooks, composition)

### User Experience
✅ Matches Google Drive UX
✅ Consistent behavior across all trigger points
✅ Clear visual feedback (loading, errors, success)
✅ Accessible keyboard navigation
✅ Dark mode support

### Performance
✅ Batch network moves (single API call)
✅ SWR caching prevents redundant fetches
✅ Optimistic UI updates where possible

---

**Document Version**: 2.0
**Last Updated**: 2025-10-02
**Status**: Production Ready
