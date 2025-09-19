import React from 'react'
import { Folder, Trash, Search, Users } from 'lucide-react'
import FoldersList from '@/components/shared/FoldersList'
import NetworksList from '@/components/shared/NetworksList'
import { FileItemBase } from '@/types/api/ndex/File'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import { MyAccountTabType } from '@/types/ui/myAccount'

interface ContentRendererProps {
  tabState: MyAccountTabType
  filteredItems: FileItemBase[]
  displayItems: FileItemBase[]
  trashItems: FileItemBase[]
  viewMode: 'grid' | 'list'
  selectedItems: string[]
  currentFolderId: string | null
  handleItemSelect: (
    event: React.MouseEvent,
    id: string,
    index: number,
    type: NDExFileType,
    sortedItems?: FileItemBase[],
  ) => void
  handleOutsideClick: (event: React.MouseEvent) => void
  handleMoveItems: (itemIds: string[], targetFolderId: string) => Promise<void>
  handleDropdownToggle: (event: React.MouseEvent, id: string, type: any) => void
  handleRemoveShortcut: (shortcutId: string) => Promise<void>
  setSelectedFilters: (filters: Set<any>) => void
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  tabState,
  filteredItems,
  displayItems,
  trashItems,
  viewMode,
  selectedItems,
  currentFolderId,
  handleItemSelect,
  handleOutsideClick,
  handleMoveItems,
  handleDropdownToggle,
  handleRemoveShortcut,
  setSelectedFilters,
}) => {
  if (tabState === MyAccountTabType.TRASH) {
    // Trash content
    return (
      <div
        className="px-4 py-1 flex-1 overflow-y-auto"
        onClick={handleOutsideClick}
      >
        {trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-70">
            <Trash className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg text-gray-500 font-medium">Trash is empty</p>
            <p className="text-sm text-gray-400">
              Items in trash will be automatically deleted after 30 days
            </p>
          </div>
        ) : (
          <>
            <FoldersList
              folders={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.FOLDER ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.FOLDER),
              )}
              viewMode={viewMode}
              tabState={tabState}
              selectedItems={selectedItems}
              onSelect={(e, id, index) =>
                handleItemSelect(e, id, index, NDExFileType.FOLDER, trashItems)
              }
              currentFolderId={currentFolderId}
              onDrop={() => {}} // No-op in trash
              onDropdownToggle={handleDropdownToggle}
            />
            <NetworksList
              items={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.NETWORK ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.NETWORK),
              )}
              tabState={tabState}
              viewMode={viewMode}
              selectedItems={selectedItems}
              onSelect={(e, id, index) =>
                handleItemSelect(e, id, index, NDExFileType.NETWORK, trashItems)
              }
              onDropdownToggle={handleDropdownToggle}
              onRemoveShortcut={handleRemoveShortcut}
            />
          </>
        )}
      </div>
    )
  } else if (tabState === MyAccountTabType.SHARED) {
    // Shared content
    return (
      <div
        className="px-4 py-1 flex-1 overflow-y-auto"
        onClick={handleOutsideClick}
      >
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-70">
            {displayItems.length === 0 ? (
              // No items at all
              <>
                <Users className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                  No items shared with you
                </p>
                <p className="text-sm text-gray-400">
                  Items shared with you by other users will appear here
                </p>
              </>
            ) : (
              // No items match the current filters
              <>
                <Search className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                  No items match the current filters
                </p>
                <p className="text-sm text-gray-400">
                  Try adjusting your filter criteria
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <FoldersList
              folders={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.FOLDER ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.FOLDER),
              )}
              viewMode={viewMode}
              tabState={tabState}
              selectedItems={selectedItems}
              showOwnerColumn={true}
              showVisibilityColumn={true}
              onSelect={(e, id, index, type, sortedItems) =>
                handleItemSelect(e, id, index, type, sortedItems)
              }
              currentFolderId={currentFolderId}
              onDrop={() => {}} // No-op for shared items
              onDropdownToggle={handleDropdownToggle}
            />
            <NetworksList
              items={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.NETWORK ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.NETWORK),
              )}
              tabState={tabState}
              viewMode={viewMode}
              selectedItems={selectedItems}
              showOwnerColumn={true}
              showVisibilityColumn={true}
              onSelect={(e, id, index, type, sortedItems) =>
                handleItemSelect(e, id, index, type, sortedItems)
              }
              onDropdownToggle={handleDropdownToggle}
              onRemoveShortcut={handleRemoveShortcut}
            />
          </>
        )}
      </div>
    )
  } else {
    // Regular folder content
    return (
      <div
        className="px-4 py-1 flex-1 overflow-y-auto"
        onClick={handleOutsideClick}
      >
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-70">
            {displayItems.length === 0 ? (
              // Folder is completely empty
              <>
                <Folder className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                  This folder is empty
                </p>
                <p className="text-sm text-gray-400">
                  Upload files or create a folder to get started
                </p>
              </>
            ) : (
              // No items match the current filters
              <>
                <Search className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-500 font-medium">
                  No items match the current filters
                </p>
                <p className="text-sm text-gray-400">
                  Try adjusting your filter criteria
                </p>
                <button
                  className="mt-4 px-4 py-2 bg-sky-700 text-white rounded-md hover:bg-sky-600 text-sm font-medium"
                  onClick={() => setSelectedFilters(new Set())}
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <FoldersList
              folders={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.FOLDER ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.FOLDER),
              )}
              viewMode={viewMode}
              tabState={tabState}
              selectedItems={selectedItems}
              onSelect={(e, id, index, type, sortedItems) =>
                handleItemSelect(e, id, index, type, sortedItems)
              }
              currentFolderId={currentFolderId}
              onDrop={handleMoveItems}
              onDropdownToggle={handleDropdownToggle}
            />
            <NetworksList
              items={filteredItems.filter(
                (item) =>
                  item.type === NDExFileType.NETWORK ||
                  (item.type === NDExFileType.SHORTCUT &&
                    item.attributes?.target_type === NDExFileType.NETWORK),
              )}
              tabState={tabState}
              viewMode={viewMode}
              selectedItems={selectedItems}
              onSelect={(e, id, index, type, sortedItems) =>
                handleItemSelect(e, id, index, type, sortedItems)
              }
              onDropdownToggle={handleDropdownToggle}
              onRemoveShortcut={handleRemoveShortcut}
            />
          </>
        )}
      </div>
    )
  }
}

export default ContentRenderer
