import { NDExUser } from '@js4cytoscape/ndex-client'

/**
 * Maps an NDExUser (from the API client) to the local User type.
 */
export function mapNDExUserToUser(ndexUser: NDExUser): User {
  const firstName = ndexUser.firstName ?? ''
  const lastName = ndexUser.lastName ?? ''
  return {
    externalId: ndexUser.externalId,
    userName: ndexUser.userName,
    firstName,
    lastName,
    displayName: [firstName, lastName].filter(Boolean).join(' ') || ndexUser.userName,
    emailAddress: ndexUser.emailAddress ?? '',
    description: ndexUser.description ?? '',
    image: ndexUser.image ?? '',
    website: ndexUser.website ?? '',
    isIndividual: ndexUser.isIndividual ?? true,
    isVerified: ndexUser.isVerified ?? false,
    creationTime: ndexUser.creationTime != null ? new Date(ndexUser.creationTime).toISOString() : '',
    modificationTime: ndexUser.modificationTime != null ? new Date(ndexUser.modificationTime).toISOString() : '',
    diskUsed: 0,
    diskQuota: 0,
    isDeleted: false,
    password: undefined,
  }
}

/**
 * Represents a user in the NDEx system
 */
export interface User {
  /**
   * Additional properties as key-value pairs
   */
  properties?: {
    [key: string]: string | number | boolean | object
  }

  /** Display name of the user */
  displayName: string

  /** Whether this account represents an individual (true) or an organization (false) */
  isIndividual: boolean

  /** Username for login */
  userName: string

  /** Password - typically only used for creating/updating users */
  password?: string

  /** Whether the user's email has been verified */
  isVerified: boolean

  /** User's first name */
  firstName: string

  /** User's last name */
  lastName: string

  /** User's email address */
  emailAddress: string

  /** Storage space used in bytes */
  diskUsed: number

  /** Total storage quota in bytes */
  diskQuota: number

  /** User's description or bio */
  description: string

  /** URL to user's profile image */
  image: string

  /** User's website URL */
  website: string

  /** ISO timestamp of when the account was created */
  creationTime: string

  /** Unique identifier for the user (UUID format) */
  externalId: string

  /** Whether the user account has been marked for deletion */
  isDeleted: boolean

  /** ISO timestamp of when the account was last modified */
  modificationTime: string
}
