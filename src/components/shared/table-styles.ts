// Common styling patterns for table components
export const tableStyles = {
  // Table container
  container: "overflow-x-auto border border-border rounded-md",
  table: "min-w-full divide-y divide-border table-fixed",
  
  // Table header
  thead: "bg-muted/50",
  th: {
    base: "px-6 py-3 text-xs font-medium text-muted-foreground tracking-wider",
    left: "text-left",
    center: "text-center", 
    right: "text-right",
  },
  
  // Table body
  tbody: "bg-background divide-y divide-border",
  tr: {
    base: "transition-colors duration-150 cursor-pointer",
    selected: "bg-blue-100 dark:bg-blue-900/50 border-l-4 border-l-blue-500",
    hover: "hover:bg-accent/50",
    dragging: "opacity-50",
    readOnly: "cursor-default",
  },
  td: {
    base: "px-6 py-2 whitespace-nowrap",
    left: "text-left",
    center: "text-center",
    right: "text-right",
  },
  
  // Grid layout
  grid: {
    container: "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4",
    item: {
      base: "p-3 rounded-md border border-border transition-all duration-200 cursor-pointer",
      selected: "bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 shadow-md",
      hover: "hover:bg-accent/50",
      dragging: "opacity-50",
      readOnly: "cursor-default",
    },
  },
  
  // Common element styles
  checkbox: "mr-3 rounded border-gray-300 text-sky-600 focus:ring-sky-500",
  button: {
    sort: "flex items-center focus:outline-none",
    dropdown: "p-1 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors inline-flex",
  },
  
  // Text styles
  text: {
    title: "text-sm font-medium text-foreground mb-2",
    content: "text-sm text-muted-foreground",
    truncate: "truncate max-w-[400px]",
    name: "text-sm font-medium text-foreground",
  },
  
  // Empty state
  empty: "text-sm text-muted-foreground",
}

// Helper functions for dynamic class generation
export const getRowClasses = (
  isSelected: boolean,
  isDragging: boolean,
  readOnly: boolean
) => {
  return [
    tableStyles.tr.base,
    isSelected && !readOnly ? tableStyles.tr.selected : tableStyles.tr.hover,
    isDragging ? tableStyles.tr.dragging : '',
    readOnly ? tableStyles.tr.readOnly : '',
  ].filter(Boolean).join(' ')
}

export const getGridItemClasses = (
  isSelected: boolean,
  isDragging: boolean,
  readOnly: boolean
) => {
  return [
    tableStyles.grid.item.base,
    isSelected && !readOnly ? tableStyles.grid.item.selected : tableStyles.grid.item.hover,
    isDragging ? tableStyles.grid.item.dragging : '',
    readOnly ? tableStyles.grid.item.readOnly : '',
  ].filter(Boolean).join(' ')
}

export const getThClasses = (align: 'left' | 'center' | 'right' = 'left', width?: string) => {
  return [
    tableStyles.th.base,
    tableStyles.th[align],
    width || '',
  ].filter(Boolean).join(' ')
}

export const getTdClasses = (align: 'left' | 'center' | 'right' = 'left') => {
  return [
    tableStyles.td.base,
    tableStyles.td[align],
  ].filter(Boolean).join(' ')
}