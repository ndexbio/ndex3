'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { FileItemBase } from '@/types/api/ndex/File'
import { useNetworkOperation } from '@/hooks/use-network-operation'

interface NetworkProperty {
  dataType: string
  propertyName: string
  propertyValue: string
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
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Use the hook to update properties
  const { getNetworkSummary } = useNetworkOperation()

  // Initialize form data when the dialog opens or network changes
  useEffect(() => {
    if (isOpen && network) {
      getNetworkSummary(network.uuid).then((summary) => {
        setName(summary.name)
        console.log(summary)

        // Set version from network attributes if available
        setVersion(summary.version || '1.0')

        // Set description from network properties if available
        setDescription(summary.description || '')

        // Convert network properties to our format
        const networkProperties: NetworkProperty[] = []

        if (network.attributes && typeof network.attributes === 'object') {
          Object.entries(network.attributes).forEach(([key, value]) => {
            // Skip version since we handle it separately
            if (key === 'version') return

            // Determine data type
            let dataType = 'string'
            if (typeof value === 'number') dataType = 'number'
            if (typeof value === 'boolean') dataType = 'boolean'

            networkProperties.push({
              dataType,
              propertyName: key,
              propertyValue: value?.toString() || '',
            })
          })
        }
        setProperties(networkProperties)
      })
    }
  }, [isOpen, network])

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
    updatedProperties[index].dataType = value
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
      { dataType: 'string', propertyName: '', propertyValue: '' },
    ])
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!name.trim() || !network) {
      return
    }

    try {
      setIsSubmitting(true)

      // Convert properties back to object format for the API
      const propertyObject: { [key: string]: any } = {
        version: version, // Include version
      }

      // Add all properties except empty ones
      properties.forEach((prop) => {
        if (prop.propertyName.trim() === '') return

        // Convert property value based on data type
        let value: string | number | boolean = prop.propertyValue

        if (prop.dataType === 'number') {
          value = parseFloat(prop.propertyValue)
          // If parseFloat fails, use the original string
          if (isNaN(value)) value = prop.propertyValue
        } else if (prop.dataType === 'boolean') {
          value = prop.propertyValue.toLowerCase() === 'true'
        }

        propertyObject[prop.propertyName] = value
      })

      // Here you would typically call your API to update the network properties
      // await ndexClient.updateNetworkProperties(network.uuid, {
      //   name: name,
      //   description: description,
      //   properties: propertyObject
      // })

      // For now, just simulate a successful update
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
        onClose()
        setIsSubmitting(false)
      }, 500)
    } catch (error) {
      console.error('Error updating network properties:', error)
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
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-full z-10 max-h-[90vh] overflow-auto">
        <div className="px-6 py-5">
          {/* Header with PRIVATE label */}
          <div className="flex items-center mb-6">
            <span className="bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded">
              PRIVATE
            </span>
          </div>

          {/* Name and Version */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1 text-gray-600">Name</label>
              <input
                type="text"
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-600">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm mb-1 text-gray-600">
              Description
            </label>
            <div>
              {/* Simple toolbar mockup - not functional */}
              <div className="flex items-center border border-gray-300 border-b-0 rounded-t-md p-2 bg-white">
                <button className="p-1 mr-1 hover:bg-gray-100 rounded">
                  <span className="font-bold">B</span>
                </button>
                <button className="p-1 mr-1 hover:bg-gray-100 rounded">
                  <span className="italic">I</span>
                </button>
                <button className="p-1 mr-1 hover:bg-gray-100 rounded">
                  <span className="underline">U</span>
                </button>
                <button className="p-1 mr-1 hover:bg-gray-100 rounded">
                  <span className="line-through">S</span>
                </button>
                {/* Add more toolbar buttons as needed */}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-b-md text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[100px]"
                disabled={isSubmitting}
                placeholder="Enter description here"
              />
            </div>
          </div>

          {/* Network Properties */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Network Properties</h3>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-gray-100 p-3 font-medium text-gray-700">
                <div className="col-span-3">Data Type</div>
                <div className="col-span-4">Property Name</div>
                <div className="col-span-4">Property Value</div>
                <div className="col-span-1"></div>
              </div>

              {/* Properties */}
              <div className="max-h-[300px] overflow-y-auto">
                {properties.map((property, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 p-2 border-t border-gray-200"
                  >
                    <div className="col-span-3 pr-2">
                      <div className="relative">
                        <select
                          value={property.dataType}
                          onChange={(e) =>
                            handlePropertyTypeChange(index, e.target.value)
                          }
                          className="appearance-none w-full bg-white border border-gray-300 text-gray-700 p-2 pr-8 rounded leading-tight focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
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
                    <div className="col-span-4 px-2">
                      <input
                        type="text"
                        value={property.propertyName}
                        onChange={(e) =>
                          handlePropertyNameChange(index, e.target.value)
                        }
                        className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="col-span-4 px-2">
                      <input
                        type="text"
                        value={property.propertyValue}
                        onChange={(e) =>
                          handlePropertyValueChange(index, e.target.value)
                        }
                        className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
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
              className="px-5 py-2 bg-sky-600 text-white text-sm font-medium rounded hover:bg-sky-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'SAVING...' : 'CONFIRM'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditNetworkPropertiesDialog
