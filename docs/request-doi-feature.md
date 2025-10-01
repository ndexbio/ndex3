# Request DOI Feature Specification

## Overview

The "Request DOI" feature enables network owners to request Digital Object Identifiers (DOIs) for their networks through the NDEx3 web application. This feature provides a comprehensive form-based interface for collecting required DOI metadata, intelligently manages network metadata updates, and supports both certified and uncertified DOI requests. The implementation includes smart validation, conditional field display, and seamless integration with the NDEx API's DOI creation endpoint.

## Architecture & Components

### Directory Structure
```
src/types/
└── doi.ts                              # DOI form data type definitions

src/lib/utils/
└── doi-licenses.ts                     # License dropdown options (17 licenses)

src/app/my-account/_components/
├── ActionDropdown.tsx                  # UI integration (Request DOI button)
└── CreateDOIDialog.tsx                 # Main DOI request dialog component

src/hooks/
└── use-network-operation.ts            # Network operations hook (createNetworkDOI)

src/lib/contexts/
└── DialogContext.tsx                   # Dialog state management
```

## Feature Requirements

### 1. Invocation Points

#### 1.1 Network Action Menu
- **Location**: Action dropdown in NetworksList component
- **Trigger**: "Request DOI" button (appears after "Open in Cytoscape Desktop")
- **Icon**: `BookCopy` from lucide-react
- **File**: `src/app/my-account/_components/ActionDropdown.tsx:467-484`
- **Context**: Current UUID of selected network

#### 1.2 Access Control & Visibility
- **Available for**: Regular networks owned by the user
- **Restrictions**:
  - ✅ Only shown for networks (not shortcuts, folders)
  - ✅ Not shown in "Shared with me" tab (only owners can request DOI)
  - ⚠️ Button disabled if network already has a valid DOI
- **File**: `src/app/my-account/_components/ActionDropdown.tsx:155-161`

**Visibility Logic**:
```typescript
const shouldShowRequestDOI =
  dropdownType === NDExFileType.NETWORK &&        // Only networks
  item?.type !== NDExFileType.SHORTCUT &&         // Not shortcuts
  tabState !== MyAccountTabType.SHARED            // Not in shared tab

const shouldDisableRequestDOI = hasDOI            // Disable if DOI exists
```

### 2. Technical Implementation

#### 2.1 Core Hook: `useNetworkOperation()`
**Path**: `src/hooks/use-network-operation.ts:146-183`

**New Export**:
```typescript
const createNetworkDOI = async (
  networkIdForDOI: string,
  contactEmail: string,
  isCertified: boolean,
): Promise<void>
```

**Function Behavior**:
```
Step 1: Validate authentication (throw error if not authenticated)
Step 2: Get NDEx client instance with auth token
Step 3: Call API endpoint: /admin/request (v2) with payload
Step 4: Refresh current network data (if this is the active network)
Step 5: Refresh parent folder contents (to update DOI status in list)
```

**API Payload Structure**:
```typescript
{
  type: 'DOI',
  networkId: string,
  properties: {
    contactEmail: string
  },
  isCertified: boolean
}
```

**Key Parameters**:
- `networkIdForDOI`: UUID of the network to create DOI for
- `contactEmail`: Email address for DOI confirmation
- `isCertified`: Boolean flag controlling network lock behavior
  - `true` → Network permanently locked, made public, no further changes allowed
  - `false` → Network remains editable after DOI creation

#### 2.2 Main Dialog Component: `CreateDOIDialog`
**Path**: `src/app/my-account/_components/CreateDOIDialog.tsx`

**Props Interface**:
```typescript
interface CreateDOIDialogProps {
  isOpen: boolean
  onClose: () => void
  networkId: string
  onSuccess?: () => void
}
```

**State Management**:
```typescript
// Form data
const [formData, setFormData] = useState<DOIFormData>({
  title: string
  version: string
  description: string
  authors: string
  rights: string
  rightsHolder: string
  reference: string
  allowFutureModifications: boolean    // Checkbox state
  licenseTitle?: string                // Conditional (if rights === 'Other')
  licenseURL?: string                  // Conditional (if rights === 'Other')
  contactEmail: string
})

// Network data preservation
const [originalNetworkSummary, setOriginalNetworkSummary] = useState<any>(null)
const [originalValues, setOriginalValues] = useState<Partial<DOIFormData>>({})

// Change tracking
const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

// UI state
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
const [isLoadingData, setIsLoadingData] = useState(true)
const [isSubmitting, setIsSubmitting] = useState(false)
```

#### 2.3 Data Flow & Two-Step Submission

##### Step 1: Load Network Data
**Trigger**: Dialog opens (`useEffect` on `isOpen` change)

**Process**:
```
1. Fetch network summary via getNetworkSummary(networkId)
2. Store complete summary (preserve all properties for later update)
3. Extract and map fields to form data:
   - summary.name → title
   - summary.properties.version.v → version
   - summary.description → description
   - summary.properties.author.v → authors
   - summary.properties.rights.v → rights
   - summary.properties.rightsHolder.v → rightsHolder
   - summary.properties.reference.v → reference
4. Parse "Other" license if applicable (see section 2.4)
5. Set form data and original values
6. Focus title input field
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:88-157`

##### Step 2: Track Modifications
**Tracked Fields** (excludes `allowFutureModifications` checkbox and `contactEmail`):
```typescript
const TRACKED_FIELDS = [
  'title', 'version', 'description', 'authors',
  'rights', 'rightsHolder', 'reference',
  'licenseTitle', 'licenseURL'
]
```

**Change Detection**:
```typescript
const handleFieldChange = (field: keyof DOIFormData, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }))

  const original = originalValues[field]
  const isModified = value !== original

  setModifiedFields(prev => {
    const updated = new Set(prev)
    isModified ? updated.add(field) : updated.delete(field)
    return updated
  })
}
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:161-186`

##### Step 3: Submit DOI Request
**Two-Step Submission Process**:

**3a. Conditional Network Update** (if any tracked fields modified):
```typescript
if (hasModifications && originalNetworkSummary) {
  const updatedSummary = {
    ...originalNetworkSummary,           // Preserve ALL original properties
    name: formData.title,
    version: formData.version,
    description: formData.description,
    properties: {
      ...originalNetworkSummary.properties,
      author: { t: 'string', v: formData.authors },
      rights: { t: 'string', v: rightsValue },  // See 2.4 for "Other" handling
      rightsHolder: { t: 'string', v: formData.rightsHolder },
      reference: { t: 'string', v: formData.reference }
    }
  }

  await updateNetworkSummary(networkId, updatedSummary)
}
```

**3b. Create DOI Request**:
```typescript
const isCertified = !formData.allowFutureModifications  // Inverted!

await createNetworkDOI(
  networkId,
  formData.contactEmail,
  isCertified
)
```

**Success Handling**:
```typescript
addToast({
  title: 'DOI Request Submitted',
  description: `DOI request was accepted by the server. A confirmation email has been sent to ${formData.contactEmail}.`,
  type: 'success',
  duration: 7000
})

onSuccess?.()  // Refresh parent folder
onClose()      // Close dialog
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:290-346`

#### 2.4 "Other" License Handling

The implementation supports custom licenses with special storage and parsing logic.

##### Storage Format

**Case 1: Both URL and Title Provided**
```typescript
// Input from form
licenseTitle: "My Custom License"
licenseURL: "example.com/license"

// Stored in properties.rights.v
"http://example.com/license|My Custom License"

// Additional properties stored
properties.rightsOther = { t: "string", v: "My Custom License" }
properties.rightsOtherURL = { t: "string", v: "http://example.com/license" }
```

**Case 2: Title Only (No URL)**
```typescript
// Input from form
licenseTitle: "My Custom License"
licenseURL: ""

// Stored in properties.rights.v
"My Custom License"

// Additional properties stored
properties.rightsOther = { t: "string", v: "My Custom License" }
// rightsOtherURL not created
```

##### Auto-Prepend HTTP Protocol
```typescript
let url = formData.licenseURL.trim()
if (!url.startsWith('http://') && !url.startsWith('https://')) {
  url = 'http://' + url
}
```

**Examples**:
- User enters: `example.com/license` → Stored as: `http://example.com/license`
- User enters: `https://example.com/license` → Stored as: `https://example.com/license`

##### Parsing on Load

**Function**: `parseOtherLicense(rightsValue: string)`

**Case 1: Pipe-Delimited Format** (URL|Title)
```typescript
rightsValue = "https://example.com/license|My Custom License"

// Parsed result
{ url: "https://example.com/license", title: "My Custom License" }
```

**Case 2: Legacy HTML Anchor Format**
```typescript
rightsValue = '<a href="https://example.com">My License</a>'

// Parsed result (via regex)
{ url: "https://example.com", title: "My License" }
```

**Case 3: Title Only**
```typescript
rightsValue = "My Custom License"

// Parsed result
{ url: "", title: "My Custom License" }
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:62-85`

##### Cleanup When Switching Away from "Other"
```typescript
if (formData.rights !== 'Other') {
  // Remove custom license properties
  delete properties.rightsOther
  delete properties.rightsOtherURL
}
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:266-275`

### 3. User Interface Design

#### 3.1 Dialog Layout

```
┌──────────────────────────────────────────────────────┐
│ Request DOI                                      [×] │
├──────────────────────────────────────────────────────┤
│ Title (2/3 width) *          │ Version (1/3) *       │
├──────────────────────────────────────────────────────┤
│ Description (rich text) *                            │
├──────────────────────────────────────────────────────┤
│ Authors (textarea) *                                 │
├──────────────────────────────────────────────────────┤
│ Contact Email *                                      │
├──────────────────────────────────────────────────────┤
│ Rights (dropdown) *                                  │
│   [If "Other" selected]                              │
│     ⮕ License Title * (indented 2.5rem)             │
│     ⮕ License URL (optional, indented 2.5rem)       │
├──────────────────────────────────────────────────────┤
│ Rights Holder                                        │
├──────────────────────────────────────────────────────┤
│ ☐ Let me add/modify the reference later.           │
│   ⚠️ Network will be permanently locked...          │
├──────────────────────────────────────────────────────┤
│ Reference (rich text)                                │
├──────────────────────────────────────────────────────┤
│                              [Cancel] [Save and      │
│                                       Request DOI]   │
└──────────────────────────────────────────────────────┘
```

**Grid System**:
- Title: `md:col-span-2` (66.67% width on desktop)
- Version: `md:col-span-1` (33.33% width on desktop)
- All other fields: Full width
- Conditional "Other" fields: Indented with `ml-10` (2.5rem left margin)

#### 3.2 Required Fields

| Field | Required | Validation |
|-------|----------|------------|
| Title | ✅ Yes | Non-empty, max 255 chars |
| Version | ✅ Yes | Non-empty |
| Description | ✅ Yes | Non-empty |
| Authors | ✅ Yes | Non-empty |
| Contact Email | ✅ Yes | Valid email format |
| Rights | ✅ Yes | Must select from dropdown |
| License Title | ⚠️ Conditional | Required if Rights === "Other" |
| License URL | ❌ Optional | Valid URL format if provided |
| Rights Holder | ❌ Optional | - |
| Reference | ❌ Optional | - |

**Submit Button State**:
```typescript
const isFormValid =
  formData.title.trim() &&
  formData.version.trim() &&
  formData.description.trim() &&
  formData.authors.trim() &&
  formData.rights &&
  formData.contactEmail.trim() &&
  (formData.rights !== 'Other' || formData.licenseTitle?.trim()) &&
  Object.keys(validationErrors).length === 0
```

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:350-358`

#### 3.3 License Dropdown Options

**File**: `src/lib/utils/doi-licenses.ts`

**17 License Options**:
1. (Empty) - "Select a license..."
2. Attribution 4.0 International (CC BY 4.0)
3. Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)
4. Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
5. Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
6. Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)
7. Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)
8. Waiver-No rights reserved (CC0)
9. Apache License 2.0 (Apache-2.0)
10. 3-clause BSD license (BSD-3-Clause)
11. 2-clause BSD license (BSD-2-Clause)
12. GNU General Public License (GPL)
13. GNU Lesser General Public License (LGPL)
14. MIT license (MIT)
15. Mozilla Public License 2.0 (MPL-2.0)
16. Common Development and Distribution License (CDDL-1.0)
17. Eclipse Public License (EPL-1.0)
18. **Other** (triggers conditional fields)

#### 3.4 Checkbox Behavior

**Label**: "Let me add/modify the reference later."

**Critical Logic Inversion**:
```typescript
// Checkbox checked (true) → Network stays editable → isCertified = false
// Checkbox unchecked (false) → Network locked → isCertified = true

const isCertified = !formData.allowFutureModifications
```

**Warning Display**:
When checkbox is **unchecked** (network will be locked):
```
⚠️ Network will be permanently locked and made public after DOI creation
```
Color: `text-amber-600 dark:text-amber-400`

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:605-623`

#### 3.5 Loading States

**Initial Load** (fetching network data):
```tsx
{isLoadingData ? (
  <div className="space-y-4">
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
  </div>
) : (
  // Form fields
)}
```

**Submit State**:
```tsx
disabled={!isFormValid || isSubmitting || isLoadingData}

{isSubmitting ? 'SUBMITTING...' : 'SAVE AND REQUEST DOI'}
```

#### 3.6 Validation Error Display

**Inline Error Messages** (shown below each field):
```tsx
{validationErrors.title && (
  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
    {validationErrors.title}
  </p>
)}
```

**Visual Indicators**:
- Border color changes to red: `border-red-500`
- Error text: `text-red-600 dark:text-red-400`
- Font size: `text-xs`

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:189-248`

### 4. Dialog Context Integration

#### 4.1 Dialog State Management
**Path**: `src/lib/contexts/DialogContext.tsx`

**Added Interface Method**:
```typescript
interface DialogContextType {
  // ... existing methods
  openCreateDOIDialog: (networkId: string) => void
}
```

**Dialog State**:
```typescript
const [createDOIDialogProps, setCreateDOIDialogProps] = useState<{
  isOpen: boolean
  networkId: string
}>({
  isOpen: false,
  networkId: '',
})
```

**Open/Close Handlers**:
```typescript
const openCreateDOIDialog = (networkId: string) => {
  setCreateDOIDialogProps({
    isOpen: true,
    networkId,
  })
}

const closeCreateDOIDialog = () => {
  setCreateDOIDialogProps(prev => ({
    ...prev,
    isOpen: false,
  }))
}

const handleCreateDOISuccess = async () => {
  await refreshParentFolder()  // Refresh folder to show updated DOI status
}
```

**Dialog Render**:
```tsx
<CreateDOIDialog
  isOpen={createDOIDialogProps.isOpen}
  onClose={closeCreateDOIDialog}
  networkId={createDOIDialogProps.networkId}
  onSuccess={handleCreateDOISuccess}
/>
```

**File Reference**: `src/lib/contexts/DialogContext.tsx:31,125-132,294-311,374-379`

#### 4.2 ActionDropdown Integration
**Path**: `src/app/my-account/_components/ActionDropdown.tsx`

**Handler Function**:
```typescript
const handleOpenCreateDOIDialog = () => {
  if (!item || !openDropdownId) return
  openCreateDOIDialog(openDropdownId)
  onClose()  // Close the dropdown
}
```

**Button Implementation**:
```tsx
{shouldShowRequestDOI && (
  <button
    className={`group flex w-full items-center gap-2 px-4 py-2 text-sm ${
      shouldDisableRequestDOI
        ? 'text-gray-400 cursor-not-allowed'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
    onClick={shouldDisableRequestDOI ? undefined : handleButtonClick(handleOpenCreateDOIDialog)}
    disabled={shouldDisableRequestDOI}
  >
    <BookCopy className={`h-4 w-4 ${
      shouldDisableRequestDOI
        ? 'text-gray-400'
        : 'text-gray-500 group-hover:text-gray-700'
    }`} />
    Request DOI
  </button>
)}
```

**File Reference**: `src/app/my-account/_components/ActionDropdown.tsx:142,287-291,467-484`

### 5. Error Handling

#### 5.1 Network Data Loading Errors

**Scenario**: `getNetworkSummary()` fails

**User Message**:
```typescript
addToast({
  title: 'Failed to Load Network Data',
  description: 'Could not retrieve network information. Please try again.',
  type: 'error'
})
```

**Behavior**:
- Loading state ends (`setIsLoadingData(false)`)
- Dialog remains open (user can retry by closing and reopening)
- Error logged to console

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:138-145`

#### 5.2 Validation Errors

| Field | Error Condition | Error Message |
|-------|----------------|---------------|
| Title | Empty | "Title is required" |
| Title | > 255 chars | "Title must be less than 255 characters" |
| Version | Empty | "Version is required" |
| Description | Empty | "Description is required" |
| Authors | Empty | "At least one author is required" |
| Rights | Not selected | "Please select a license" |
| Contact Email | Empty | "Contact email is required" |
| Contact Email | Invalid format | "Please enter a valid email address" |
| License Title | Empty (if Other) | "License title is required when 'Other' is selected" |
| License Title | > 255 chars | "License title must be less than 255 characters" |
| License URL | Invalid format | "Please enter a valid URL (e.g., example.com/license)" |

**Validation Trigger**: On submit (`validateForm()` called)

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:189-248`

#### 5.3 Submission Errors

**Scenario**: `updateNetworkSummary()` or `createNetworkDOI()` fails

**User Message**:
```typescript
addToast({
  title: 'DOI Request Failed',
  description: error.message || 'Failed to submit DOI request. Please try again.',
  type: 'error',
  duration: 7000
})
```

**Behavior**:
- Dialog stays open (allows user to retry)
- Error logged to console
- Submission state reset (`setIsSubmitting(false)`)

**File Reference**: `src/app/my-account/_components/CreateDOIDialog.tsx:330-337`

### 6. Type Definitions

#### 6.1 DOI Form Data
**Path**: `src/types/doi.ts`

```typescript
export interface DOIFormData {
  title: string
  version: string
  description: string
  authors: string
  rights: string
  rightsHolder: string
  reference: string
  allowFutureModifications: boolean
  licenseTitle?: string
  licenseURL?: string
  contactEmail: string
}

export interface DOIFormValidation {
  isValid: boolean
  errors: Record<string, string>
}

export interface LicenseOption {
  value: string
  label: string
}
```

### 7. Dark Mode Support

All UI components support dark mode with Tailwind's `dark:` prefix:

**Color Scheme**:
```typescript
// Backgrounds
bg-white dark:bg-gray-900        // Dialog background
bg-white dark:bg-gray-800        // Input backgrounds

// Text
text-gray-900 dark:text-gray-100  // Primary text
text-gray-600 dark:text-gray-300  // Labels
text-gray-700 dark:text-gray-300  // Dropdowns

// Borders
border-gray-300 dark:border-gray-600  // Default borders
border-red-500                        // Error borders (same in both modes)

// Validation Errors
text-red-600 dark:text-red-400        // Error messages

// Warnings
text-amber-600 dark:text-amber-400    // Warning text

// Buttons
text-sky-700 dark:text-sky-600        // Cancel button
bg-sky-600 hover:bg-sky-700           // Submit button (same in both modes)
```

### 8. Testing Considerations

#### 8.1 Manual Testing Checklist

**Basic Flow**:
- [ ] Dialog opens from ActionDropdown "Request DOI" button
- [ ] Network data pre-populates correctly
- [ ] All form fields are editable
- [ ] Required field validation works
- [ ] Submit button disabled when invalid

**Rights Dropdown**:
- [ ] All 18 license options display
- [ ] Selecting "Other" shows conditional fields
- [ ] Conditional fields are indented (2.5rem)
- [ ] Switching away from "Other" hides conditional fields
- [ ] License Title required when "Other" selected
- [ ] License URL optional but validated if provided

**Checkbox Behavior**:
- [ ] "Let me add/modify reference later" checkbox toggles
- [ ] Warning appears when checkbox unchecked
- [ ] Warning disappears when checkbox checked
- [ ] Correct `isCertified` value sent to API (inverted)

**Data Persistence**:
- [ ] Changing title/description updates network properties
- [ ] Unchanged fields don't trigger update
- [ ] Original network properties preserved (not overwritten)
- [ ] "Other" license stored correctly (URL|Title format)

**Success Flow**:
- [ ] Success toast shows with correct email
- [ ] Dialog closes after success
- [ ] Parent folder refreshes
- [ ] Network DOI status updates in list

**Error Handling**:
- [ ] Network load failure shows error toast
- [ ] Validation errors display inline
- [ ] Submission errors show toast
- [ ] Dialog stays open on error (allows retry)

**Dark Mode**:
- [ ] All elements render correctly in dark mode
- [ ] Text remains readable
- [ ] Borders visible
- [ ] Error messages visible

#### 8.2 Edge Cases

**Empty Network Data**:
- Network with no description → Form shows empty field
- Network with no version → Defaults to "1.0"
- Network with no rights → Dropdown defaults to first option

**Long Text**:
- Very long title → Validation error at 256+ chars
- Very long description → RichTextEditor handles overflow
- Very long authors → Textarea expands

**Special Characters**:
- Email with + or . → Validates correctly
- URL with unicode → Accepts and stores
- Title with quotes/apostrophes → Escapes properly

**Network Properties**:
- Network with existing DOI → Button disabled
- Network with custom properties → Preserves all in update
- Network with read-only flag → (DOI creation should still work)

### 9. Future Enhancements

#### 9.1 Potential Improvements

**Form Enhancements**:
- [ ] Save draft DOI form data (localStorage or API)
- [ ] Pre-populate contact email from user profile
- [ ] Auto-save form as user types
- [ ] Author list with add/remove buttons (structured input)
- [ ] License search/filter in dropdown
- [ ] Field-level help tooltips

**Validation Improvements**:
- [ ] Real-time validation (on blur instead of on submit)
- [ ] ORCID ID validation for authors
- [ ] DOI uniqueness check before submission
- [ ] Publication year format validation (if re-added)

**UX Improvements**:
- [ ] Show DOI preview before submission
- [ ] Confirm dialog if closing with unsaved changes
- [ ] Progress indicator during submission
- [ ] Keyboard shortcuts (Cmd+Enter to submit)

**Feature Extensions**:
- [ ] Bulk DOI creation for multiple networks
- [ ] DOI status tracking (pending, approved, rejected)
- [ ] View existing DOI metadata
- [ ] Edit DOI metadata (if allowed by NDEx API)
- [ ] DOI history/audit log

**Integration Features**:
- [ ] Link to DOI once created (display in network details)
- [ ] DOI badge in network list view
- [ ] Copy DOI to clipboard functionality
- [ ] Export DOI citation in various formats (BibTeX, RIS, etc.)

#### 9.2 Known Limitations

**Current Constraints**:
- Cannot edit DOI metadata after creation (API limitation)
- Cannot cancel DOI request once submitted
- No validation against existing DOIs
- No DOI preview before submission
- No draft saving functionality

**API Dependencies**:
- Requires NDEx API v2 `/admin/request` endpoint
- Requires authentication (Keycloak token)
- Network must be owned by requesting user
- Email confirmation is server-side (no control from UI)

### 10. Related Documentation

- **NDEx API Documentation**: DOI creation endpoint specifications
- **Share Feature**: `docs/ndex-share-feature.md` (similar dialog pattern)
- **Network Operations**: `src/hooks/use-network-operation.ts` (related network functions)
- **Dialog Management**: `src/lib/contexts/DialogContext.tsx` (dialog state pattern)

### 11. Development Notes

#### 11.1 Key Design Decisions

**Why Two-Step Submission?**
- Ensures network metadata is updated before DOI creation
- Prevents data loss if user modifies fields
- Maintains data consistency between network and DOI
- Allows for partial updates (only changed fields)

**Why Invert Checkbox Logic?**
- User-facing language is positive ("allow future modifications")
- API parameter `isCertified` has negative semantics (locked = true)
- Inversion makes UI intuitive while maintaining API compatibility

**Why Store Complete Network Summary?**
- Preserves all network properties during update
- Prevents accidental deletion of custom properties
- Allows for selective field updates
- Maintains backward compatibility

**Why Indent "Other" License Fields?**
- Visual hierarchy indicates dependency
- Improves scannability
- Follows common UI pattern (Google Drive, Dropbox, etc.)
- Reduces cognitive load

#### 11.2 Performance Considerations

**Network Data Fetching**:
- Single API call on dialog open
- Data cached in component state (no refetching on field changes)
- Loading skeleton shown during fetch

**Form Validation**:
- Validation triggered only on submit (not on every keystroke)
- Errors cleared on field change (reduces UI flicker)
- Complex validation (email, URL) uses regex (fast)

**Change Tracking**:
- Set-based tracking (O(1) lookups)
- Only tracked fields compared (not entire form)
- Minimal re-renders (specific state updates)

**Submission**:
- Conditional update (only if fields modified)
- Parallel operations not possible (update must precede DOI creation)
- Success/error handling uses toast (non-blocking)

#### 11.3 Accessibility

**Keyboard Navigation**:
- Dialog closes on Escape key
- Tab order follows logical form flow
- Enter key submits form (if validation passes)
- Focus management: title field focused on open

**Screen Reader Support**:
- All form fields have associated labels
- Required fields marked with asterisk (*) and `aria-required`
- Error messages connected via `aria-describedby`
- Loading states announced
- Success/error toasts announced

**Visual Accessibility**:
- Sufficient color contrast (WCAG AA compliant)
- Error states use both color and text
- Focus indicators visible
- Dark mode support

### 12. Troubleshooting

#### Common Issues

**Issue**: Submit button remains disabled
- **Cause**: Validation errors or missing required fields
- **Solution**: Check for red error messages below fields, fill all required fields

**Issue**: Network data doesn't load
- **Cause**: Network ID invalid or API error
- **Solution**: Check console for errors, verify network exists, ensure authentication

**Issue**: "Other" license fields don't appear
- **Cause**: Dropdown value not set to "Other"
- **Solution**: Select "Other" from Rights dropdown

**Issue**: DOI request fails silently
- **Cause**: API error or network permissions issue
- **Solution**: Check console logs, verify network ownership, check authentication

**Issue**: Network properties not updating
- **Cause**: No fields were modified (change detection prevents unnecessary updates)
- **Solution**: This is expected behavior; only modified fields trigger updates

**Issue**: Checkbox warning doesn't show
- **Cause**: Checkbox is checked (network will remain editable)
- **Solution**: Uncheck the checkbox to see warning (network will be locked)

---

**Last Updated**: September 30, 2025
**Author**: Claude (AI Assistant)
**Reviewed By**: [Pending]
