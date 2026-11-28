/**
 * Form data structure for DOI creation dialog
 */
export interface DOIFormData {
  title: string
  version: string
  description: string
  authors: string
  rights: string
  rightsHolder: string
  reference: string
  allowFutureModifications: boolean // Checkbox state (inverted for isCertified)
  licenseTitle?: string // Only required if rights === 'Other'
  licenseURL?: string // Only required if rights === 'Other'
  contactEmail: string
}

/**
 * Validation result for DOI form
 */
export interface DOIFormValidation {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * License option for rights dropdown
 */
export interface LicenseOption {
  value: string
  label: string
}
