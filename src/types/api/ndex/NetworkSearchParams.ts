import { Permission } from '@js4cytoscape/ndex-client'

export interface NetworkSearchParams {
  searchString: string
  permission?: Permission
  includeGroups?: boolean
  accountName?: string
}
