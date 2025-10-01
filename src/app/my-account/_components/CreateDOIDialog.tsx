'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { useToast } from '@/lib/contexts/ToastContext'
import RichTextEditor from '@/components/ui/rich-text-editor'
import { LICENSE_OPTIONS } from '@/lib/utils/doi-licenses'
import type { DOIFormData } from '@/types/doi'

interface CreateDOIDialogProps {
  isOpen: boolean
  onClose: () => void
  networkId: string
  onSuccess?: () => void
}

const CreateDOIDialog: React.FC<CreateDOIDialogProps> = ({
  isOpen,
  onClose,
  networkId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<DOIFormData>({
    title: '',
    version: '',
    description: '',
    authors: '',
    rights: '',
    rightsHolder: '',
    reference: '',
    allowFutureModifications: false,
    licenseTitle: '',
    licenseURL: '',
    contactEmail: '',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [originalNetworkSummary, setOriginalNetworkSummary] = useState<any>(null)
  const [originalValues, setOriginalValues] = useState<Partial<DOIFormData>>({})
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const titleInputRef = useRef<HTMLInputElement>(null)

  const { getNetworkSummary, updateNetworkSummary, createNetworkDOI } = useNetworkOperation()
  const { addToast } = useToast()

  // Fields to track for modifications (exclude checkbox and email)
  const TRACKED_FIELDS = [
    'title',
    'version',
    'description',
    'authors',
    'rights',
    'rightsHolder',
    'reference',
    'licenseTitle',
    'licenseURL',
  ]

  // Parse "Other" license from stored value
  const parseOtherLicense = (rightsValue: string): { title: string; url: string } => {
    if (!rightsValue) return { title: '', url: '' }

    // Case 1: Pipe-delimited format "URL|Title"
    if (rightsValue.includes('|')) {
      const [url, title] = rightsValue.split('|')
      return { url: url.trim(), title: title.trim() }
    }

    // Case 2: Legacy HTML anchor format (href=...)
    if (rightsValue.includes('href=')) {
      const hrefMatch = rightsValue.match(/href=["']([^"']+)["']/)
      const titleMatch = rightsValue.match(/>([^<]+)</)
      return {
        url: hrefMatch?.[1] || '',
        title: titleMatch?.[1] || rightsValue,
      }
    }

    // Case 3: Title only
    return { title: rightsValue, url: '' }
  }

  // Load network data when dialog opens
  useEffect(() => {
    if (!isOpen || !networkId) return

    const loadNetworkData = async () => {
      setIsLoadingData(true)
      try {
        const summary = await getNetworkSummary(networkId)
        setOriginalNetworkSummary(summary)

        const rightsValue = summary.properties?.rights?.v || ''
        const isOtherLicense = rightsValue === 'Other' ||
          !LICENSE_OPTIONS.find((opt) => opt.value === rightsValue)

        let initialFormData: DOIFormData

        if (isOtherLicense && rightsValue) {
          const parsed = parseOtherLicense(rightsValue)
          initialFormData = {
            title: summary.name || '',
            version: summary.properties?.version?.v || '1.0',
            description: summary.description || '',
            authors: summary.properties?.author?.v || '',
            rights: 'Other',
            rightsHolder: summary.properties?.rightsHolder?.v || '',
            reference: summary.properties?.reference?.v || '',
            allowFutureModifications: false,
            licenseTitle: parsed.title,
            licenseURL: parsed.url,
            contactEmail: '',
          }
        } else {
          initialFormData = {
            title: summary.name || '',
            version: summary.properties?.version?.v || '1.0',
            description: summary.description || '',
            authors: summary.properties?.author?.v || '',
            rights: rightsValue,
            rightsHolder: summary.properties?.rightsHolder?.v || '',
            reference: summary.properties?.reference?.v || '',
            allowFutureModifications: false,
            licenseTitle: '',
            licenseURL: '',
            contactEmail: '',
          }
        }

        setFormData(initialFormData)
        setOriginalValues(initialFormData)
        setModifiedFields(new Set())
        setValidationErrors({})
      } catch (error) {
        console.error('Failed to load network data:', error)
        addToast({
          title: 'Failed to Load Network Data',
          description: 'Could not retrieve network information. Please try again.',
          type: 'error',
        })
      } finally {
        setIsLoadingData(false)
      }
    }

    loadNetworkData()

    // Focus title input when dialog opens
    if (titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, networkId])

  // Handle field changes with modification tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFieldChange = (field: keyof DOIFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Track modifications
    const original = originalValues[field]
    const isModified = value !== original

    setModifiedFields((prev) => {
      const updated = new Set(prev)
      if (isModified) {
        updated.add(field)
      } else {
        updated.delete(field)
      }
      return updated
    })

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Title validation
    if (!formData.title.trim()) {
      errors.title = 'Title is required'
    } else if (formData.title.length > 255) {
      errors.title = 'Title must be less than 255 characters'
    }

    // Version validation
    if (!formData.version.trim()) {
      errors.version = 'Version is required'
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = 'Description is required'
    }

    // Authors validation
    if (!formData.authors.trim()) {
      errors.authors = 'At least one author is required'
    }

    // Rights validation
    if (!formData.rights) {
      errors.rights = 'Please select a license'
    }

    // Conditional validation for "Other" license
    if (formData.rights === 'Other') {
      if (!formData.licenseTitle?.trim()) {
        errors.licenseTitle = 'License title is required when "Other" is selected'
      } else if (formData.licenseTitle.length > 255) {
        errors.licenseTitle = 'License title must be less than 255 characters'
      }

      // License URL is optional, but if provided must be valid
      if (formData.licenseURL?.trim()) {
        const url = formData.licenseURL.trim()
        const urlPattern = /^(https?:\/\/)?([\w\-]+(\.[\w\-]+)+)(\/.*)?$/
        if (!urlPattern.test(url)) {
          errors.licenseURL = 'Please enter a valid URL (e.g., example.com/license)'
        }
      }
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required'
    } else if (!emailPattern.test(formData.contactEmail)) {
      errors.contactEmail = 'Please enter a valid email address'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Build updated network summary
  const buildUpdatedSummary = () => {
    const properties = {
      ...originalNetworkSummary.properties,
      author: { t: 'string', v: formData.authors },
      rightsHolder: { t: 'string', v: formData.rightsHolder },
      reference: { t: 'string', v: formData.reference },
    }

    // Handle rights based on selection
    if (formData.rights === 'Other') {
      // Build pipe-delimited value if URL provided
      let rightsValue = formData.licenseTitle
      let url = formData.licenseURL?.trim() || ''

      if (url) {
        // Auto-prepend http:// if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'http://' + url
        }
        rightsValue = `${url}|${formData.licenseTitle}`
        properties.rightsOtherURL = { t: 'string', v: url }
      }

      properties.rights = { t: 'string', v: rightsValue }
      properties.rightsOther = { t: 'string', v: formData.licenseTitle }
    } else {
      // Standard license selection
      properties.rights = { t: 'string', v: formData.rights }

      // Clean up rightsOther properties if switching from "Other"
      if (originalNetworkSummary.properties?.rightsOther) {
        delete properties.rightsOther
      }
      if (originalNetworkSummary.properties?.rightsOtherURL) {
        delete properties.rightsOtherURL
      }
    }

    return {
      ...originalNetworkSummary,
      name: formData.title,
      version: formData.version,
      description: formData.description,
      properties,
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Update network if any tracked fields modified
      const hasModifications = Array.from(modifiedFields).some((field) =>
        TRACKED_FIELDS.includes(field)
      )

      if (hasModifications && originalNetworkSummary) {
        const updatedSummary = buildUpdatedSummary()
        await updateNetworkSummary(networkId, updatedSummary)
      }

      // Step 2: Create DOI request
      // IMPORTANT: Invert checkbox state for isCertified
      // Checkbox checked = allow future mods = isCertified false
      // Checkbox unchecked = lock network = isCertified true
      const isCertified = !formData.allowFutureModifications

      await createNetworkDOI(networkId, formData.contactEmail, isCertified)

      // Success notification
      addToast({
        title: 'DOI Request Submitted',
        description: `DOI request was accepted by the server. A confirmation email has been sent to ${formData.contactEmail}.`,
        type: 'success',
        duration: 7000,
      })

      onSuccess?.()
      onClose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to create DOI:', error)
      addToast({
        title: 'DOI Request Failed',
        description: error.message || 'Failed to submit DOI request. Please try again.',
        type: 'error',
        duration: 7000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isFormValid =
    formData.title.trim() &&
    formData.version.trim() &&
    formData.description.trim() &&
    formData.authors.trim() &&
    formData.rights &&
    formData.contactEmail.trim() &&
    (formData.rights !== 'Other' || formData.licenseTitle?.trim()) &&
    Object.keys(validationErrors).length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-gray-300 opacity-50" onClick={onClose}></div>

      {/* Dialog box */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[800px] max-w-full z-10 max-h-[90vh] overflow-auto">
        <div className="px-6 py-5">
          {/* Header */}
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
            Request DOI
          </h2>

          {isLoadingData ? (
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ) : (
            <>
              {/* Title and Version */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    ref={titleInputRef}
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                      validationErrors.title
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isSubmitting}
                    placeholder="Network title"
                  />
                  {validationErrors.title && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {validationErrors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                    Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleFieldChange('version', e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                      validationErrors.version
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isSubmitting}
                    placeholder="Version"
                  />
                  {validationErrors.version && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {validationErrors.version}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
                  Description <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(value) => handleFieldChange('description', value)}
                  placeholder="Enter description here..."
                  disabled={isSubmitting}
                />
                {validationErrors.description && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {validationErrors.description}
                  </p>
                )}
              </div>

              {/* Authors */}
              <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Authors <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.authors}
                  onChange={(e) => handleFieldChange('authors', e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    validationErrors.authors
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isSubmitting}
                  placeholder="One author per line"
                  rows={3}
                />
                {validationErrors.authors && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {validationErrors.authors}
                  </p>
                )}
              </div>

              {/* Contact Email */}
              <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    validationErrors.contactEmail
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isSubmitting}
                  placeholder="your.email@example.com"
                />
                {validationErrors.contactEmail && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {validationErrors.contactEmail}
                  </p>
                )}
              </div>

              {/* Rights */}
              <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Rights <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.rights}
                    onChange={(e) => handleFieldChange('rights', e.target.value)}
                    className={`appearance-none w-full bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300 px-2 py-1 pr-8 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                      validationErrors.rights
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    disabled={isSubmitting}
                  >
                    {LICENSE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
                {validationErrors.rights && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {validationErrors.rights}
                  </p>
                )}
              </div>

              {/* Conditional fields for "Other" license */}
              {formData.rights === 'Other' && (
                <div className="ml-10 space-y-4 mb-4">
                  {/* License Title */}
                  <div>
                    <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                      License Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.licenseTitle}
                      onChange={(e) => handleFieldChange('licenseTitle', e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                        validationErrors.licenseTitle
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      disabled={isSubmitting}
                      placeholder="e.g., Creative Commons Custom License"
                    />
                    {validationErrors.licenseTitle && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {validationErrors.licenseTitle}
                      </p>
                    )}
                  </div>

                  {/* License URL */}
                  <div>
                    <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                      License URL{' '}
                      <span className="text-gray-500 text-xs">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.licenseURL}
                      onChange={(e) => handleFieldChange('licenseURL', e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                        validationErrors.licenseURL
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      disabled={isSubmitting}
                      placeholder="e.g., example.com/license or https://example.com/license"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can omit http:// - it will be added automatically
                    </p>
                    {validationErrors.licenseURL && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {validationErrors.licenseURL}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Rights Holder */}
              <div className="mb-4">
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Rights Holder
                </label>
                <input
                  type="text"
                  value={formData.rightsHolder}
                  onChange={(e) => handleFieldChange('rightsHolder', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={isSubmitting}
                  placeholder="Rights holder"
                />
              </div>

              {/* Checkbox - Let me add/modify reference later */}
              <div className="mb-2">
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowFutureModifications}
                    onChange={(e) =>
                      handleFieldChange('allowFutureModifications', e.target.checked)
                    }
                    className="mr-2"
                    disabled={isSubmitting}
                  />
                  Let me add/modify the reference later.
                </label>
                {!formData.allowFutureModifications && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-6">
                    ⚠️ Network will be permanently locked and made public after DOI creation
                  </p>
                )}
              </div>

              {/* Reference */}
              <div className="mb-4">
                <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
                  Reference
                </label>
                <RichTextEditor
                  content={formData.reference}
                  onChange={(value) => handleFieldChange('reference', value)}
                  placeholder="Enter reference here..."
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sky-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded border border-gray-200 dark:border-gray-700"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              className={`px-5 py-2 text-sm font-medium rounded transition-colors ${
                isFormValid && !isSubmitting && !isLoadingData
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!isFormValid || isSubmitting || isLoadingData}
            >
              {isSubmitting ? 'SUBMITTING...' : 'SAVE AND REQUEST DOI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateDOIDialog
