import type { LicenseOption } from '@/types/doi'

/**
 * Available license names for DOI creation
 * Single source of truth - value and label are the same for these licenses
 */
const LICENSE_NAMES = [
  'Attribution 4.0 International (CC BY 4.0)',
  'Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)',
  'Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
  'Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)',
  'Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)',
  'Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)',
  'Waiver-No rights reserved (CC0)',
  'Apache License 2.0 (Apache-2.0)',
  '3-clause BSD license (BSD-3-Clause)',
  '2-clause BSD license (BSD-2-Clause)',
  'GNU General Public License (GPL)',
  'GNU Lesser General Public License (LGPL)',
  'MIT license (MIT)',
  'Mozilla Public License 2.0 (MPL-2.0)',
  'Common Development and Distribution License (CDDL-1.0)',
  'Eclipse Public License (EPL-1.0)',
  'Other',
] as const

/**
 * License options for dropdown selection
 * Derived from LICENSE_NAMES to eliminate redundancy
 */
export const LICENSE_OPTIONS: LicenseOption[] = [
  // First item has custom label for empty value
  { value: '', label: 'Select a license...' },
  // All other items have value === label
  ...LICENSE_NAMES.map((name) => ({ value: name, label: name })),
]

/**
 * Get license label by value
 */
export const getLicenseLabel = (value: string): string => {
  return LICENSE_OPTIONS.find((opt) => opt.value === value)?.label || value
}
