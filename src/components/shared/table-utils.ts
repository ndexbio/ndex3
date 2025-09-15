// Shared utility functions for table components

// Format date in a readable way: M/D/YY H:MM AM/PM
export const formatDate = (dateStr?: string | Date | number) => {
  if (!dateStr) return 'N/A'

  let date: Date

  if (typeof dateStr === 'number') {
    // Handle timestamp (milliseconds)
    date = new Date(dateStr)
  } else if (typeof dateStr === 'string') {
    date = new Date(dateStr)
  } else {
    date = new Date(dateStr)
  }

  // Check if date is valid
  if (isNaN(date.getTime())) return 'N/A'

  // Format: M/D/YY H:MM AM/PM
  const month = date.getMonth() + 1
  const day = date.getDate()
  const year = date.getFullYear().toString().slice(-2)

  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'

  hours = hours % 12
  hours = hours ? hours : 12 // 0 should be 12

  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`
}

// Format counts with commas for readability
export const formatCount = (count?: number) => {
  if (count === undefined || count === null) return 'N/A'
  return count.toLocaleString()
}

// Generate display name for items
export const getDisplayName = (item: { name?: string }, fallback: string = 'Untitled') => {
  return item.name || fallback
}