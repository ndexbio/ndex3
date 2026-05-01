import DocTemplate from '../components/DocTemplate'

export default function DataModelPage() {
  return (
    <DocTemplate
      title="CX Data Model"
      description="Overview of the Cytoscape Exchange (CX) network format used by NDEx"
      lastUpdated="December 13, 2022"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  The Cytoscape Exchange (CX) format is a flexible, modular
                  format for representing biological networks.
                  <br />
                  <br />
                  CX is designed for:
                  <ul className="list-disc ml-6 mt-2">
                    <li>Streaming large networks efficiently</li>
                    <li>Extensibility through modular “aspects”</li>
                    <li>Lossless representation of complex network data</li>
                  </ul>
                </>
              ),
            },
            {
              type: 'note',
              content:
                'CX is intended for transmission and exchange, not as an internal storage format.',
            },
          ],
        },
        {
          title: 'Aspect-Oriented Design',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  CX organizes network data into independent modules called
                  <b> aspects</b>.
                  <br />
                  <br />
                  Each aspect represents a specific type of data, such as
                  nodes, edges, or attributes. Applications can process only
                  the aspects they need and ignore the rest.
                </>
              ),
            },
          ],
        },
        {
          title: 'Core Aspects',
          blocks: [
            {
              type: 'steps',
              steps: [
                'nodes → define network nodes (with unique IDs)',
                'edges → define connections between nodes',
                'nodeAttributes → metadata for nodes',
                'edgeAttributes → metadata for edges',
                'networkAttributes → metadata for entire network',
                'cartesianLayout → coordinates for visualization',
              ],
            },
          ],
        },
        {
          title: 'How CX Works',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Data is transmitted as a stream of aspect fragments',
                'Each aspect can be split into smaller chunks',
                'Fragments can be sent in any order',
                'Applications reconstruct the network from these fragments',
              ],
            },
            {
              type: 'note',
              content:
                'Streaming allows processing of very large networks without loading everything into memory.',
            },
          ],
        },
        {
          title: 'Metadata System',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  Each aspect includes metadata describing:
                  <ul className="list-disc ml-6 mt-2">
                    <li>name and version</li>
                    <li>element counts</li>
                    <li>ID counters</li>
                    <li>consistency groups</li>
                  </ul>
                </>
              ),
            },
          ],
        },
        {
          title: 'Data Types',
          blocks: [
            {
              type: 'steps',
              steps: [
                'string (default)',
                'boolean',
                'double',
                'integer / long',
                'list types (e.g., list_of_string, list_of_double)',
              ],
            },
          ],
        },
        {
          title: 'Identifiers and References',
          blocks: [
            {
              type: 'steps',
              steps: [
                'All elements use integer IDs',
                'IDs must be unique within an aspect',
                'Aspects can reference elements in other aspects by ID',
                'Applications should resolve references after parsing',
              ],
            },
          ],
        },
        {
          title: 'CX Versions',
          blocks: [
            {
              type: 'steps',
              steps: [
                'CX (v1) → original format',
                'CX2 → improved and recommended version',
              ],
            },
            {
              type: 'note',
              content: 'New applications should use CX2 whenever possible.',
            },
          ],
        },
        {
          title: 'Best Practices',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Keep aspect dependencies minimal',
                'Avoid overly complex cross-references',
                'Use CX for exchange, not internal storage',
                'Validate IDs and references when parsing',
              ],
            },
          ],
        },
        {
          title: 'Full Specification',
          blocks: [
            {
              type: 'text',
              content: (
                <>
                  For complete schema definitions, examples, and advanced
                  aspects, refer to the official specification:
                  <br />
                  <br />
                  <a
                    href="https://cytoscape.org/cx/cx2/specification/cytoscape-exchange-format-specification-(version-2)/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    CX2 Specification
                  </a>
                </>
              ),
            },
          ],
        },
      ]}
    />
  )
}