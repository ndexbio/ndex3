import DocTemplate from '../components/DocTemplate'
import React from 'react'
import searchSettings from '@/images/search_settings.png'

export default function FindingAndQuerying() {
  return (
    <DocTemplate
      title="Finding and Querying Networks"
      description="Learn how to search and query networks in NDEx"
      lastUpdated="December 2018"
      sections={[
        {
          title: 'Search for Networks',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Enter a keyword in the search bar',
                'Browse results, sort by name or modification type, or rest to default (best query match).',
                'Filter by ownership, visibility, and file type.',
              ],
            },
            {
              type: 'image',
              image: { src: searchSettings, alt: 'Search interface' },
            },
          ],
        },
        {
          title: 'Run Queries',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Enter query term',
                'Select query type',
                'Run query',
              ],
            },
            {
              type: 'note',
              content: 'Queries return subnetworks based on your selection.',
            },
          ],
        },
      ]}
    />
  )
}