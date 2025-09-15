import { NDExFileType } from '@js4cytoscape/ndex-client'

export interface FileItemBase {
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date | number
  attributes: {
    [key: string]: any
    // Common network attributes
    edges?: number
    nodes?: number
    edgeCount?: number
    nodeCount?: number
    visibility?: string
    owner?: string
    updatedBy?: string
    // Allow any other attributes
  }
}