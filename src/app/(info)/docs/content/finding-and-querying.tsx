import DocTemplate from '../components/DocTemplate'
import React from 'react'

export default function FindingAndQuerying() {
  return (
    <DocTemplate
      title="Finding and Querying Networks"
      description="Learn how to search and query networks in NDEx"
      lastUpdated="December 2018"
      sections={[
        {
          title: 'Search for Networks',
          steps: [
            'Enter a keyword in the search bar',
            'Browse results',
            'Filter by type',
          ],
          images: ['Search interface', 'Search results'],
        },
        {
          title: 'Run Queries',
          steps: [
            'Enter query term',
            'Select query type',
            'Run query',
          ],
          note: 'Queries return subnetworks based on your selection.',
        },
      ]}
    />
  )
}