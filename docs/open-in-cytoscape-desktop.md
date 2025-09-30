# Open in Cytoscape Desktop Feature Specification

## Overview

The "Open in Cytoscape Desktop" feature enables users to seamlessly transfer networks from NDEx3 web application directly to their local Cytoscape Desktop application. This feature supports both regular networks and shortcut chains, with intelligent resolution of nested shortcuts and robust authentication token management.

## Architecture & Components

### Directory Structure
```
src/hooks/
└── use-cyndex.ts                # CyNDEx operations hook with shortcut resolution

src/app/my-account/_components/
└── ActionDropdown.tsx           # UI integration (handler for button click)

src/lib/api/
└── ndex-client-manager.ts       # NDEx client configuration (existing)

src/lib/contexts/
├── KeycloakContext.tsx          # Authentication context (existing)
└── ToastContext.tsx             # Toast notifications (updated for dark mode)
```

## Feature Requirements

### 1. Invocation Points

#### 1.1 Network Action Menu
- **Location**: Action dropdown in NetworksList component
- **Trigger**: "Open in Cytoscape Desktop" button (first item in dropdown)
- **Icon**: `ExternalLink` from lucide-react
- **File**: `src/app/my-account/_components/ActionDropdown.tsx:444-459`
- **Context**: Current UUID and type of selected network/shortcut

#### 1.2 Access Control
- **Available for**: Regular networks and shortcuts pointing to networks
- **Restrictions**: Only shown in regular network menu (not in error state)
- **Authentication**: Works for both authenticated and anonymous users

### 2. Technical Implementation

#### 2.1 Core Hook: `useCyNDEx()`
**Path**: `src/hooks/use-cyndex.ts`

**Exports**:
```typescript
interface CyNDExHook {
  openInCytoscape: (
    itemId: string,
    itemName: string,
    itemType: NDExFileType,
    itemAttributes: Record<string, any>
  ) => Promise<void>;
  isOpening: Record<string, boolean>; // Track loading state per item
}
```

**Key Functions**:

##### `resolveShortcutChain()`
Recursively resolves shortcut chains to find the final target network.

**Algorithm**:
```
1. If item is NETWORK → Return immediately with network UUID
2. While item is SHORTCUT:
   a. Validate target_status === 'ACTIVE'
   b. Get target UUID and type from attributes
   c. If target is NETWORK → Return network UUID
   d. If target is SHORTCUT → Fetch shortcut via API and continue
   e. Increment depth counter (max 10 to prevent infinite loops)
3. Convert API response (camelCase) to snake_case for consistency
4. Return final network UUID and access key
```

**Parameters**:
```typescript
itemId: string              // Starting UUID (network or shortcut)
itemType: NDExFileType      // Type of starting item
itemAttributes: Record<string, any>  // Attributes containing target info
```

**Returns**:
```typescript
{
  networkId: string;        // Final network UUID to open
  accessKey?: string;       // Access key if needed (from chain)
}
```

**Error Scenarios**:
| Condition | Error Message |
|-----------|---------------|
| `target_status !== 'ACTIVE'` | "This shortcut is no longer valid. The target has been deleted." |
| Chain depth > 10 | "Shortcut chain too deep. Maximum depth of 10 exceeded." |
| Missing target info | "Invalid shortcut: missing target information." |
| Target is FOLDER | "Cannot open FOLDER in Cytoscape Desktop. Only networks are supported." |
| API fetch fails | "Failed to resolve shortcut chain: [error details]" |

##### `getFreshIdToken()`
Ensures authentication token is fresh before CyNDEx operations.

**Best Practice Pattern**:
```typescript
// Always call keycloak.updateToken(60) before critical operations
await keycloak.updateToken(60)  // Refresh if expires within 60 seconds
return keycloak.idToken
```

**Benefits**:
- ✅ Proactive token refresh (prevents mid-operation expiration)
- ✅ Minimal overhead (only makes API call when needed)
- ✅ Keycloak handles refresh/validity check internally
- ✅ Prevents expired token errors

**Return Values**:
- Authenticated user: Fresh ID token (string)
- Anonymous user: `undefined` (no auth needed for public networks)

##### `openInCytoscape()`
Main function to send networks to Cytoscape Desktop.

**Execution Flow**:
```
Step 1: Resolve shortcut chain → Get final network UUID
Step 2: Get fresh ID token (if authenticated)
Step 3: Create CyNDEx service instance (port 1234)
Step 4: Set NDEx server URL (with https:// protocol)
Step 5: Set authentication token (if user logged in)
Step 6: Check if Cytoscape is running (getCyNDExStatus)
Step 7: Send final network to Cytoscape
Step 8: Show success toast notification
```

**Error Handling**:
- Catches all errors and displays user-friendly toast messages
- Re-throws errors for debugging in console
- Sets loading state to false in finally block

#### 2.2 Attribute Naming Convention Handling

**Critical Implementation Detail**: The codebase uses **two different naming conventions** for shortcut attributes:

##### Table Data (NetworksList/FoldersList)
Uses **snake_case**:
```typescript
{
  target: "uuid-of-target",
  target_type: "NETWORK" | "SHORTCUT" | "FOLDER",
  target_status: "ACTIVE" | "DELETED" | "IN_TRASH"
}
```

##### API Response (getShortcut)
Uses **camelCase**:
```typescript
{
  target: "uuid-of-target",
  targetType: "NETWORK" | "SHORTCUT" | "FOLDER",
  targetStatus: "ACTIVE" | "DELETED" | "IN_TRASH"  // Note: may not exist
}
```

##### Conversion Strategy
When fetching nested shortcuts via API, convert response to snake_case:
```typescript
currentAttributes = {
  target: shortcutData.target,
  target_type: shortcutData.targetType,        // camelCase → snake_case
  target_status: shortcutData.targetStatus || 'ACTIVE',  // Default if missing
  accessKey: shortcutData.accessKey
}
```

This ensures consistency throughout the resolution loop.

#### 2.3 URL Protocol Handling

**Problem**: Config file may omit protocol from `ndexBaseUrl`
```json
{
  "ndexBaseUrl": "dev3.ndex.ucsd.edu"  // Missing https://
}
```

**Solution**: Always ensure protocol is present
```typescript
const ndexUrl = config.ndexBaseUrl && config.ndexBaseUrl.startsWith('http')
  ? config.ndexBaseUrl
  : `https://${config.ndexBaseUrl || 'ndexbio.org'}`
```

This pattern matches `ndex-client-manager.ts:8` for consistency.

### 3. User Interface Integration

#### 3.1 ActionDropdown Button
**Path**: `src/app/my-account/_components/ActionDropdown.tsx:444-459`

**Button States**:
```typescript
// Normal state
<ExternalLink /> "Open in Cytoscape Desktop"

// Loading state (while operation in progress)
<Loader2 spin /> "Opening..."

// Disabled state
opacity-50, cursor-not-allowed
```

#### 3.2 Click Handler
```typescript
const handleOpenInCytoscape = () => {
  if (!item || !openDropdownId) return

  // Fire and forget - close menu immediately to prevent double-clicks
  openInCytoscape(
    openDropdownId,
    item.name || 'Unnamed network',
    dropdownType || NDExFileType.NETWORK,
    item.attributes || {}
  )

  onClose()  // ⚠️ Critical: Close BEFORE async operation
}
```

**Double-Click Prevention Strategy** (3 layers):
1. **Primary**: Menu closes immediately on click
2. **Secondary**: Button disabled during operation (`isOpening` state)
3. **Tertiary**: Visual loading feedback (spinner + "Opening..." text)

#### 3.3 Toast Notifications

**Success Toast** (Dark Mode Optimized):
```typescript
{
  title: 'Opening "[network name]" in Cytoscape Desktop',
  description: 'The network is being loaded in Cytoscape.',
  type: 'success',
  duration: 4000
}
```

**Error Toast**:
```typescript
{
  title: 'Failed to open network in Cytoscape',
  description: '[Specific error message]',
  type: 'error',
  duration: 6000
}
```

**Dark Mode Color Scheme** (Updated in `ToastContext.tsx:56`):
```typescript
// Success toast
border-green-500
bg-green-50
dark:bg-slate-800           // Neutral dark background
dark:border-green-500       // Green accent border
text-green-800
dark:text-green-300         // Readable green text
```

Benefits:
- ✅ Excellent contrast in dark mode
- ✅ Maintains color-coding for message types
- ✅ Consistent with app's dark theme

## CyNDEx Service Integration

### 4. Dependencies

#### 4.1 CyNDEx Service
- **Package**: `@js4cytoscape/ndex-client` (already in package.json)
- **Import**: `import { CyNDExService, NDExFileType } from '@js4cytoscape/ndex-client'`
- **Class**: `CyNDExService` (Cytoscape-NDEx Bridge)

#### 4.2 Service Configuration
```typescript
const cyNDEx = new CyNDExService(1234)  // Cytoscape REST API port
cyNDEx.setNDExBaseURL('https://dev3.ndex.ucsd.edu')
cyNDEx.setAuthToken(idToken)  // OAuth ID token (optional)
```

#### 4.3 Key Methods Used

**Status Check**:
```typescript
await cyNDEx.getCyNDExStatus()
// Throws error if Cytoscape not running or CyNDEx-2 not installed
```

**Send Network**:
```typescript
await cyNDEx.postNDExNetworkToCytoscape(
  networkId: string,    // Final network UUID (not shortcut)
  accessKey?: string    // For private/shared networks
)
```

### 5. Authentication Flow

#### 5.1 Anonymous Users
```
User clicks "Open in Cytoscape Desktop"
→ No token needed
→ CyNDEx service configured without auth
→ Network sent to Cytoscape (if public)
```

#### 5.2 Authenticated Users
```
User clicks "Open in Cytoscape Desktop"
→ Call keycloak.updateToken(60)
→ Get fresh idToken
→ CyNDEx service configured with token
→ Network sent to Cytoscape (with auth)
```

#### 5.3 Token Expiration Handling
```
If updateToken() fails:
  → Session expired
  → Force re-login via keycloak.login()
  → Show error: "Session expired. Please log in again."
```

## Example Scenarios

### Scenario 1: Direct Network
```
User Action: Click "Open in Cytoscape Desktop" on network ABC
Flow:
  1. resolveShortcutChain(ABC, NETWORK, {...})
     → Returns immediately: { networkId: ABC }
  2. Send ABC to Cytoscape
Result: ✅ Network ABC opens in Cytoscape
```

### Scenario 2: Single Shortcut
```
User Action: Click on shortcut S1 → Network XYZ
Flow:
  1. resolveShortcutChain(S1, SHORTCUT, {target: XYZ, target_type: NETWORK, target_status: ACTIVE})
     → Validates target_status === 'ACTIVE'
     → Returns: { networkId: XYZ }
  2. Send XYZ to Cytoscape
Result: ✅ Network XYZ opens in Cytoscape
```

### Scenario 3: Chained Shortcuts
```
User Action: Click on shortcut S1 → S2 → S3 → Network ABC
Flow:
  1. resolveShortcutChain(S1, SHORTCUT, {...})
     → Check S1.target_status === 'ACTIVE' ✓
     → S1.target_type === 'SHORTCUT'
     → Fetch S2 via API
     → Convert camelCase → snake_case
     → Check S2.target_status === 'ACTIVE' ✓
     → S2.target_type === 'SHORTCUT'
     → Fetch S3 via API
     → Check S3.target_status === 'ACTIVE' ✓
     → S3.target_type === 'NETWORK'
     → Returns: { networkId: ABC }
  2. Send ABC to Cytoscape
Result: ✅ Network ABC opens in Cytoscape
```

### Scenario 4: Broken Chain
```
User Action: Click on shortcut S1 → S2 (DELETED)
Flow:
  1. resolveShortcutChain(S1, SHORTCUT, {...})
     → Check S1.target_status === 'ACTIVE' ✓
     → S1.target_type === 'SHORTCUT'
     → Fetch S2 via API
     → Check S2.target_status === 'DELETED' ✗
     → Throw error
Result: ❌ Error toast: "This shortcut is no longer valid. The target has been deleted."
```

### Scenario 5: Shortcut to Folder
```
User Action: Click on shortcut S1 → Folder F1
Flow:
  1. resolveShortcutChain(S1, SHORTCUT, {target: F1, target_type: FOLDER, ...})
     → Check S1.target_status === 'ACTIVE' ✓
     → S1.target_type === 'FOLDER'
     → Throw error
Result: ❌ Error toast: "Cannot open FOLDER in Cytoscape Desktop. Only networks are supported."
```

### Scenario 6: Cytoscape Not Running
```
User Action: Click "Open in Cytoscape Desktop"
Flow:
  1. resolveShortcutChain(...) → Success
  2. cyNDEx.getCyNDExStatus() → Error (connection refused)
  3. Throw error
Result: ❌ Error toast: "Unable to connect to Cytoscape Desktop. Please ensure Cytoscape is running and the CyNDEx-2 app is installed."
```

## Testing Checklist

### Functional Tests
- [ ] Open regular network directly
- [ ] Open network via single shortcut (active)
- [ ] Open network via shortcut chain (2-3 levels)
- [ ] Try inactive shortcut (target_status !== 'ACTIVE')
- [ ] Try shortcut pointing to folder
- [ ] Try very deep shortcut chain (> 10 levels)
- [ ] Verify access keys work through chain
- [ ] Test with authenticated user
- [ ] Test with anonymous user
- [ ] Test token expiration handling

### UI/UX Tests
- [ ] Menu closes immediately on click
- [ ] Button shows loading state during operation
- [ ] Cannot double-click (button disabled)
- [ ] Success toast appears on success
- [ ] Error toast appears on failure
- [ ] Toast colors readable in dark mode
- [ ] Toast colors readable in light mode

### Error Handling Tests
- [ ] Cytoscape not running
- [ ] CyNDEx-2 app not installed
- [ ] Network access denied
- [ ] Invalid network UUID
- [ ] Network deleted mid-operation
- [ ] Token expired mid-operation

## Performance Considerations

### Optimization Strategies
1. **Lazy API Calls**: Only fetch shortcuts when needed (not upfront)
2. **Early Return**: Direct networks skip resolution entirely
3. **Depth Limit**: Prevent infinite loops with max depth = 10
4. **Token Caching**: Keycloak handles token refresh efficiently

### Network Requests
- **Best Case** (direct network): 1 request (getCyNDExStatus)
- **Average Case** (single shortcut): 2 requests (status + postNetwork)
- **Worst Case** (10-level chain): 11 requests (10 getShortcut + status)

## Security Considerations

### Authentication
- ✅ Always refresh token before operations
- ✅ ID token never stored in component state
- ✅ Token passed directly to CyNDEx service
- ✅ Anonymous access supported for public networks

### Access Control
- ✅ Access keys preserved through shortcut chains
- ✅ NDEx API validates permissions server-side
- ✅ Shortcuts inherit target's access requirements

### Error Messages
- ✅ No sensitive information in error messages
- ✅ Generic messages for security-related failures
- ✅ Detailed errors only in console (for debugging)

## Future Enhancements

### Potential Features
1. **Status Indicator**: Show if Cytoscape is connected
2. **Bulk Operations**: Open multiple networks at once
3. **Port Configuration**: Allow custom Cytoscape port in settings
4. **Progress Tracking**: Show network loading progress
5. **Recent Networks**: Cache recently opened network UUIDs
6. **Keyboard Shortcut**: Hotkey to open selected network

### Technical Debt
- Consider extracting shortcut resolution to separate utility
- Add TypeScript types for CyNDEx service responses
- Implement retry logic for transient network errors
- Add telemetry for feature usage analytics

## Troubleshooting Guide

### Common Issues

#### "Unable to connect to Cytoscape Desktop"
**Cause**: Cytoscape not running or wrong port
**Solution**:
1. Launch Cytoscape Desktop
2. Ensure CyNDEx-2 app is installed
3. Verify Cytoscape is using default port 1234

#### "This shortcut is no longer valid"
**Cause**: Target network/shortcut was deleted
**Solution**: Delete the broken shortcut or update target

#### "Session expired. Please log in again"
**Cause**: Keycloak session expired
**Solution**: User will be redirected to login automatically

#### Network doesn't open
**Cause**: Private network without proper access
**Solution**: Ensure user has permission or access key is valid

## Related Documentation

- [My Account Page](./my-account-page.md) - Action dropdown integration
- [Share Feature](./ndex-share-feature.md) - Access key handling
- [Config System](./CONFIG_SYSTEM.md) - NDEx base URL configuration
- [CyNDEx-2 Documentation](https://github.com/cytoscape/cyndex-2) - External dependency

## Changelog

### Version 1.0.0 (2025-09-30)
- ✅ Initial implementation
- ✅ Recursive shortcut resolution
- ✅ Token management with auto-refresh
- ✅ Dark mode toast optimization
- ✅ Double-click prevention
- ✅ URL protocol handling
- ✅ Attribute naming convention compatibility
