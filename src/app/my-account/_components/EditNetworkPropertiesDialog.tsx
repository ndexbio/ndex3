'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { FileItemBase } from '@/types/api/ndex/File'
import { useNetworkOperation } from '@/hooks/use-network-operation'
import { CXDataType } from '@js4cytoscape/ndex-client'
import RichTextEditor from '@/components/ui/rich-text-editor'

interface NetworkProperty {
  dataType: CXDataType
  propertyName: string
  propertyValue: string
}

// CX2 Property format
interface CX2Property {
  t: CXDataType  // type
  v: any         // value
}


interface EditNetworkPropertiesDialogProps {
  isOpen: boolean
  onClose: () => void
  network: FileItemBase | null
  onSuccess?: () => void
}

const EditNetworkPropertiesDialog: React.FC<
  EditNetworkPropertiesDialogProps
> = ({ isOpen, onClose, network, onSuccess }) => {
  const [name, setName] = useState('')
  const [version, setVersion] = useState('1.0')
  const [description, setDescription] = useState('')
  const [properties, setProperties] = useState<NetworkProperty[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [originalSummary, setOriginalSummary] = useState<any>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Original state for change tracking
  const [originalState, setOriginalState] = useState({
    name: '',
    version: '1.0',
    description: '',
    properties: [] as NetworkProperty[],
    visibility: '' // Store original visibility
  })


  // Debug current state values (commented out for production)
  // console.log('Current state - name:', name, 'version:', version, 'description:', description, 'properties:', properties)

  // Use the hook to update properties
  const { getNetworkSummary, updateNetworkSummary } = useNetworkOperation()

  // Change detection functions
  const hasFieldChanges = () => {
    return (
      name !== originalState.name ||
      version !== originalState.version ||
      description !== originalState.description
    )
  }

  const hasPropertyChanges = () => {
    if (properties.length !== originalState.properties.length) {
      return true
    }

    return properties.some(prop => {
      const originalProp = originalState.properties.find(orig =>
        orig.propertyName === prop.propertyName
      )
      return !originalProp ||
        originalProp.propertyValue !== prop.propertyValue ||
        originalProp.dataType !== prop.dataType
    })
  }

  const hasAnyChanges = () => {
    return hasFieldChanges() || hasPropertyChanges()
  }

  // Initialize form data when the dialog opens or network changes
  useEffect(() => {
    if (isOpen && network) {
      getNetworkSummary(network.uuid)
        .then((summary) => {
          console.log('Network summary received:', summary)
          console.log('Summary keys:', Object.keys(summary || {}))
          console.log('Summary.name:', summary?.name)
          console.log('Summary.description:', summary?.description)
          console.log('Summary.properties:', summary?.properties)
          console.log('Summary.properties type:', typeof summary?.properties)

          // Set basic fields from summary
          const nameValue = summary.name || network.name || ''
          const descriptionValue = summary.description || ''

          console.log('Setting name to:', nameValue)
          console.log('Setting description to:', descriptionValue)

          setName(nameValue)
          setDescription(descriptionValue)

          // Handle version from properties if available
          let versionValue = '1.0'
          if (summary.properties && summary.properties.version) {
            console.log('Found version property:', summary.properties.version)
            versionValue = summary.properties.version.v?.toString() || '1.0'
          }

          console.log('Setting version to:', versionValue)
          setVersion(versionValue)

          // Convert network properties from CX2 format to our format
          const networkProperties: NetworkProperty[] = []

          console.log('Processing CX2 network properties:', summary.properties)
          console.log('Properties is array?', Array.isArray(summary.properties))
          console.log('Properties is object?', typeof summary.properties === 'object')

          // Handle CX2 format properties: { key: { t: "type", v: value } }
          if (summary.properties && typeof summary.properties === 'object') {
            Object.entries(summary.properties).forEach(([key, propData]: [string, any]) => {
              console.log(`Processing property "${key}":`, propData)

              // Skip version since we handle it separately, but keep other fields
              if (key === 'version') return

              // Handle CX2 format with t (type) and v (value)
              if (propData && typeof propData === 'object' && 'v' in propData) {
                // Use the actual CXDataType from the API response
                let dataType: CXDataType = propData.t || CXDataType.STRING

                // Convert value to string for editing
                let displayValue = ''
                if (Array.isArray(propData.v)) {
                  displayValue = JSON.stringify(propData.v)
                } else {
                  displayValue = propData.v?.toString() || ''
                }

                console.log(`Adding property: ${key}, type: ${dataType}, value: ${displayValue}`)

                networkProperties.push({
                  dataType,
                  propertyName: key,
                  propertyValue: displayValue,
                })
              } else {
                // Handle legacy format or direct values
                let dataType: CXDataType = CXDataType.STRING
                if (typeof propData === 'number') {
                  dataType = Number.isInteger(propData) ? CXDataType.INTEGER : CXDataType.DOUBLE
                } else if (typeof propData === 'boolean') {
                  dataType = CXDataType.BOOLEAN
                }

                console.log(`Adding legacy property: ${key}, type: ${dataType}, value: ${propData}`)

                networkProperties.push({
                  dataType,
                  propertyName: key,
                  propertyValue: propData?.toString() || '',
                })
              }
            })
          }

          console.log('Converted network properties:', networkProperties)
          setProperties(networkProperties)

          // Store the original summary for preserving non-editable attributes
          setOriginalSummary(summary)

          // Store original state for change tracking
          setOriginalState({
            name: nameValue,
            version: versionValue,
            description: descriptionValue,
            properties: [...networkProperties], // Deep copy
            visibility: summary.visibility || ''
          })
        })
        .catch((error) => {
          console.error('Error fetching network summary:', error)
          // Fallback to basic network data if summary fails
          const fallbackName = network.name || ''
          const fallbackVersion = '1.0'
          const fallbackDescription = ''
          const fallbackProperties: NetworkProperty[] = []

          setName(fallbackName)
          setVersion(fallbackVersion)
          setDescription(fallbackDescription)
          setProperties(fallbackProperties)

          // Store original state for change tracking
          setOriginalState({
            name: fallbackName,
            version: fallbackVersion,
            description: fallbackDescription,
            properties: [...fallbackProperties],
            visibility: ''
          })

          // No original summary in fallback case
          setOriginalSummary(null)
        })
    }
  }, [isOpen, network]) // ✅ Removed getNetworkSummary from dependencies

  // Focus the name input when the dialog opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isOpen])

  // Handle property removal
  const handleRemoveProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index))
  }

  // Handle property type change
  const handlePropertyTypeChange = (index: number, value: string) => {
    const updatedProperties = [...properties]
    updatedProperties[index].dataType = value as CXDataType
    setProperties(updatedProperties)
  }

  // Handle property name change
  const handlePropertyNameChange = (index: number, value: string) => {
    const updatedProperties = [...properties]
    updatedProperties[index].propertyName = value
    setProperties(updatedProperties)
  }

  // Handle property value change
  const handlePropertyValueChange = (index: number, value: string) => {
    const updatedProperties = [...properties]
    updatedProperties[index].propertyValue = value
    setProperties(updatedProperties)
  }

  // Handle adding new property
  const handleAddProperty = () => {
    setProperties([
      ...properties,
      { dataType: CXDataType.STRING, propertyName: '', propertyValue: '' },
    ])
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim() || !network) {
      return
    }

    // Only proceed if there are changes
    if (!hasAnyChanges()) {
      return
    }

    try {
      setIsSubmitting(true)

      // Convert properties back to CX2 format for the API
      const propertyObject: { [key: string]: CX2Property } = {
        version: { t: CXDataType.STRING, v: version }, // Include version
      }

      // Add all properties except empty ones
      properties.forEach((prop) => {
        if (prop.propertyName.trim() === '') return

        // Convert property value based on CXDataType
        let value: any = prop.propertyValue

        if (prop.dataType === CXDataType.INTEGER || prop.dataType === CXDataType.LONG) {
          const intValue = parseInt(prop.propertyValue)
          value = isNaN(intValue) ? prop.propertyValue : intValue
        } else if (prop.dataType === CXDataType.DOUBLE) {
          const floatValue = parseFloat(prop.propertyValue)
          value = isNaN(floatValue) ? prop.propertyValue : floatValue
        } else if (prop.dataType === CXDataType.BOOLEAN) {
          value = prop.propertyValue.toLowerCase() === 'true'
        } else if (prop.dataType.startsWith('list_of_')) {
          try {
            value = JSON.parse(prop.propertyValue)
          } catch {
            // If JSON parsing fails, keep as string
            value = prop.propertyValue
          }
        }

        // Store in CX2 format with type and value
        propertyObject[prop.propertyName] = { t: prop.dataType, v: value }
      })

      // Prepare the network summary update, preserving only visibility
      const updatedSummary = {
        name: name,
        description: description,
        properties: propertyObject,
        visibility: originalState.visibility // Only preserve visibility
      }

      // Call the API to update the network summary
      await updateNetworkSummary(network.uuid, updatedSummary)

      // Update original state to reflect the new saved state
      setOriginalState({
        name,
        version,
        description,
        properties: [...properties],
        visibility: originalState.visibility // Keep the same visibility
      })

      // Refresh the network list to show updated information
      if (onSuccess) {
        onSuccess() // This should trigger a refresh of the network list
      }
      onClose()
    } catch (error) {
      console.error('Error updating network properties:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !network) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-300 opacity-50"
        onClick={onClose}
      ></div>

      {/* Dialog box */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[800px] max-w-full z-10 max-h-[90vh] overflow-auto">
        <div className="px-6 py-5">
          {/* Name and Version */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">Name</label>
              <input
                type="text"
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
                placeholder="Network name"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
                placeholder="Version"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm mb-2 text-gray-600 dark:text-gray-300">
              Description
            </label>
            <RichTextEditor
              content={description}
              onChange={setDescription}
              placeholder="Enter description here..."
              disabled={isSubmitting}
            />
          </div>

          {/* Network Properties */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-3">Network Properties</h3>
            <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-25 bg-gray-100 dark:bg-gray-700 px-3 py-1 font-medium text-gray-700 dark:text-gray-300 text-xs">
                <div className="col-span-6">Property Name</div>
                <div className="col-span-13">Property Value</div>
                <div className="col-span-5">Data Type</div>
                <div className="col-span-1"></div>
              </div>

              {/* Properties */}
              <div className="max-h-[300px] overflow-y-auto">
                {properties.map((property, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-25 px-2 py-1 border-t border-gray-200 dark:border-gray-600"
                  >
                    <div className="col-span-6 pr-2">
                      <input
                        type="text"
                        value={property.propertyName}
                        onChange={(e) =>
                          handlePropertyNameChange(index, e.target.value)
                        }
                        className="w-full border border-gray-300 dark:border-gray-600 px-2 py-1 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                      />
                    </div>
                    <div className="col-span-13 px-2">
                      <input
                        type="text"
                        value={property.propertyValue}
                        onChange={(e) =>
                          handlePropertyValueChange(index, e.target.value)
                        }
                        className="w-full border border-gray-300 dark:border-gray-600 px-2 py-1 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                      />
                    </div>
                    <div className="col-span-5 px-2">
                      <div className="relative">
                        <select
                          value={property.dataType}
                          onChange={(e) =>
                            handlePropertyTypeChange(index, e.target.value)
                          }
                          className="appearance-none w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 pr-6 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                        >
                          <option value={CXDataType.STRING}>string</option>
                          <option value={CXDataType.INTEGER}>integer</option>
                          <option value={CXDataType.LONG}>long</option>
                          <option value={CXDataType.DOUBLE}>double</option>
                          <option value={CXDataType.BOOLEAN}>boolean</option>
                          <option value={CXDataType.LIST_OF_STRING}>list_of_string</option>
                          <option value={CXDataType.LIST_OF_INTEGER}>list_of_integer</option>
                          <option value={CXDataType.LIST_OF_LONG}>list_of_long</option>
                          <option value={CXDataType.LIST_OF_DOUBLE}>list_of_double</option>
                          <option value={CXDataType.LIST_OF_BOOLEAN}>list_of_boolean</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center pl-1">
                      <button
                        onClick={() => handleRemoveProperty(index)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Property Button */}
            <div className="mt-4">
              <button
                onClick={handleAddProperty}
                className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700 transition-colors text-sm font-medium"
              >
                ADD NEW PROPERTY
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sky-700 hover:bg-gray-50 text-sm font-medium rounded border border-gray-200"
              disabled={isSubmitting}
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              className={`px-5 py-2 text-sm font-medium rounded transition-colors ${
                hasAnyChanges() && !isSubmitting
                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!hasAnyChanges() || isSubmitting}
            >
              {isSubmitting ? 'SAVING...' : hasAnyChanges() ? 'CONFIRM' : 'NO CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditNetworkPropertiesDialog
