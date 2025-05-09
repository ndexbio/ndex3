/**
 * Utility functions for handling downloads
 */

/**
 * Save data as a downloadable file
 * @param data The data to save
 * @param filename The filename to use
 * @param type The mime type
 */
export const saveAsFile = (data: any, filename: string, type: string = 'application/json') => {
  // For JSON data, convert to string if it's an object
  const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : data
  
  // Create a blob with the data
  const blob = new Blob([content], { type })
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob)
  
  // Create a temporary link element
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  
  // Append to the document, click it, then remove it
  document.body.appendChild(link)
  link.click()
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Format a filename for a network download
 * @param networkName The name of the network
 * @param format The format (e.g., 'cx', 'cx2')
 * @returns Formatted filename
 */
export const formatNetworkFilename = (networkName: string, format: string): string => {
  // Replace invalid filename characters with underscores
  const safeNetworkName = networkName.replace(/[^\w\s.-]/g, '_')
  
  // Get current date for filename
  const date = new Date()
  const dateString = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  
  return `${safeNetworkName}_${dateString}.${format.toLowerCase()}`
} 