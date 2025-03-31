'use client'

import React from 'react'
import { useUserNetwork } from '@/hooks/use-user-network'
import { useAuth } from '@/lib/contexts/KeycloakContext'
import { NetworkSummary } from '@/types/api/ndex/NetworkSummary'

interface NetworksListProps {
  pageSize?: number
}

export default function NetworksList({ pageSize = 20 }: NetworksListProps) {
  const [currentPage, setCurrentPage] = React.useState(0)
  const { isAuthenticated, token, isInitializing } = useAuth()
  const offset = currentPage * pageSize

  // Use the updated hook with offset and limit parameters
  const {
    data: networks,
    isLoading,
    error,
    isEmpty,
  } = useUserNetwork(offset, pageSize)

  // Handle pagination
  const handleNextPage = () => {
    if (networks && networks.length === pageSize) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Show loading spinner if keycloak is still initializing
  if (isInitializing) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !token) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please sign in to view networks.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    )
  }

  // Display authentication errors differently
  if (error) {
    const isAuthError =
      error.message?.includes('401') ||
      error.message?.includes('unauthorized') ||
      error.message?.includes('NDEx_Unauthorized')

    return (
      <div
        className={`${isAuthError ? 'bg-yellow-50' : 'bg-red-50'} border ${
          isAuthError ? 'border-yellow-200' : 'border-red-200'
        } rounded-md p-4 my-4`}
      >
        <p className={`${isAuthError ? 'text-yellow-800' : 'text-red-600'}`}>
          {isAuthError
            ? 'Authentication error. Your session may have expired or you may not have access to view these networks.'
            : `Error loading networks: ${error.message || 'Unknown error'}`}
        </p>
        {isAuthError && (
          <button
            className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 text-sm"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        )}
      </div>
    )
  }

  if (isEmpty || !networks || networks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No networks found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-md shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">My Networks</h2>
        <p className="text-sm text-gray-500">
          Showing {networks.length} networks
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Owner
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nodes
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Edges
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Modified
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {networks.map((network: NetworkSummary) => (
              <tr key={network.externalId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                    {network.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {network.description?.substring(0, 50)}
                    {network.description?.length > 50 ? '...' : ''}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {network.owner}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {network.nodeCount?.toLocaleString() || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {network.edgeCount?.toLocaleString() || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(network.modificationTime).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0}
          className={`px-4 py-2 text-sm rounded-md ${
            currentPage === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">Page {currentPage + 1}</span>
        <button
          onClick={handleNextPage}
          disabled={!networks || networks.length < pageSize}
          className={`px-4 py-2 text-sm rounded-md ${
            !networks || networks.length < pageSize
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  )
}
