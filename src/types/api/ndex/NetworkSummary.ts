import { PropertyValuePair } from './PropertyValuePair'
import { Visibility } from '@js4cytoscape/ndex-client'

export interface NetworkSummary {
  name: string // Name or title of the network, not unique
  description: string // Text description of the network
  creationTime: Date // Time at which the network was created
  modificationTime: Date // Time at which the network was last modified
  visibility: Visibility // Privacy level of the network
  version: string // Semantic version number
  nodeCount: number // The number of node objects in the network
  edgeCount: number // The number of edge objects in the network
  properties: PropertyValuePair[] // List of network property value pairs
  externalId: string // UUID of this network
  ownerUUID: string // UUID of the network owner
  isReadOnly: boolean // True if the network is marked as read-only in NDEx
  subnetworkIds: number[] // List of identifiers for subnetworks
  errorMessage: string // Error message if the CX network is invalid
  isValid: boolean // True if the network is a valid CX network
  owner: string // Username of the network owner
  indexed: boolean // True if the network needs to be indexed
  completed: boolean // True if all pending operations on this network have been finished
  warnings: string[] // Warning messages from the CX network validator, if any
  isShowcase: boolean // True if this network is showcased in the owner's account
  isCertified: boolean // True if this is a published network in NDEx with a DOI assigned
  hasLayout: boolean // True if the network has coordinates on its nodes
  hasSample: boolean // True if the network has a sample network
  // TODO: Missing Properties? Different on dev1.ndexbio.org and www.ndexbio.org?
  // isDeleted?: boolean // True if the network is marked as deleted
  // cxFormat?: string // The format of the network
  // cxFileSize?: number // The size of the network in bytes
  // cx2FileSize?: number // The size of the network in bytes
}
