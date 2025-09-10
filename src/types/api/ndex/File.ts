import { NDExFileType } from '@js4cytoscape/ndex-client'

export interface FileItemBase {
  uuid: string
  name: string
  type: NDExFileType
  modificationTime: string | Date
  attributes: {
    [key: string]: string | number | boolean
  }
}