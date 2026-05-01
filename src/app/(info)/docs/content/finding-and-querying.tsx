import DocTemplate from '../components/DocTemplate'
import searchSettings from '@/images/search_settings.png'
import searchBar from '@/images/search_bar.png'
import searchResults from '@/images/search_results.png'
import networkView from '@/images/network_view.png'
import queryRunner from '@/images/query_runner.png'
import queryTypes from '@/images/query_types.png'
import queryResult from '@/images/query_result.png'

export default function FindingAndQuerying() {
  return (
    <DocTemplate
      title="Finding and Querying Networks"
      description="Learn how to search NDEx, view networks, and run neighborhood queries"
      lastUpdated="April 2026"
      sections={[
        {
          title: 'Overview',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx hosts many networks marked as PUBLIC that are accessible without signing in. Public networks can be found, viewed, and queried. This guide covers searching across NDEx as well as running neighborhood queries on a specific network.',
            },
            {
              type: 'note',
              content:
                'Private networks only appear in your search results if you own them or have been granted access by their administrator.',
            },
          ],
        },

        {
          title: 'Search for Networks, Folders and Shortcuts',
          blocks: [
            {
              type: 'text',
              content:
                'Enter a keyword in the search bar to find networks across NDEx. Search matches against network titles, descriptions, and indexed attributes (see "Indexed Attributes" below for the full list). Folders and shortcuts are also displayed in the results.',
            },
            {
              type: 'image',
              image: { src: searchBar, alt: 'NDEx search bar' },
            },
            {
              type: 'steps',
              steps: [
                'Enter a keyword in the search bar',
                'Browse results — sort by name or modification time, or reset to default (best query match)',
                'Filter by ownership, visibility, and file type',
                'Click a result to open the network',
              ],
            },
            {
              type: 'image',
              image: {
                src: searchSettings,
                alt: 'Search results with sort and filter controls',
              },
            },
            {
              type: 'image',
              image: {
                src: searchResults,
                alt: 'Search results page showing matched networks',
              },
            },
          ],
        },

        {
          title: 'Advanced Search Syntax',
          blocks: [
            {
              type: 'text',
              content:
                'NDEx uses Apache Solr (Lucene) under the hood, so the search bar accepts advanced query syntax. You can target specific attributes, use wildcards, and combine terms with boolean operators.',
            },
            {
              type: 'steps',
              steps: [
                'Wildcards: type met* to match metabolism, metabolic, methionine, etc.',
                'Field-scoped search: name:met* matches only the network name field',
                'UUID lookup: uuid:<network-uuid> finds a specific network by ID',
                'Numeric ranges: nodeCount:[11 TO 79] finds networks with 11–79 nodes',
                'Date ranges: creationTime:[2024-01-01T00:00:00Z TO 2024-12-31T23:59:59Z]',
                'Owner search: owner:ndextutorials lists all networks owned by that account',
                'Boolean combinations: name:metabolism AND edgeCount:[1 TO 5000]',
              ],
            },
          ],
        },

        {
          title: 'Indexed Network Attributes',
          blocks: [
            {
              type: 'text',
              content:
                'These network-level attributes are indexed and can be searched directly:',
            },
            {
              type: 'steps',
              steps: [
                'name — network title (freetext)',
                'description — description, content, and data sources (freetext)',
                'version — network version (freetext)',
                'labels — custom user tags (freetext)',
                'methods — methods used to generate the network (freetext)',
                'networkType — type of interactions (protein, genetic, chemical, etc.) (freetext)',
                'organism — associated organisms (freetext)',
                'disease — associated diseases (freetext)',
                'tissue — organs, tissue types, cell types, cell lines (freetext)',
                'rightsHolder — holder of network rights (freetext)',
                'rights — rights asserted by the rightsHolder (freetext)',
                'author — individuals responsible for the network content (freetext)',
                'creationTime — when the network was created (date)',
                'modificationTime — when the network was last modified (date)',
                'edgeCount — number of edges (integer)',
                'nodeCount — number of nodes (integer)',
                'visibility — Public or Private (string)',
                'uuid — network external identifier (string)',
                'owner — account name of the owner (string)',
              ],
            },
            {
              type: 'note',
              content:
                'creationTime, modificationTime, edgeCount, nodeCount, visibility, uuid, and owner are NDEx-internal attributes — they are calculated or derived rather than stored in the CX networkAttributes aspect.',
            },
          ],
        },

        {
          title: 'Indexed Node Attributes',
          blocks: [
            {
              type: 'text',
              content:
                'These node-level attributes are indexed for search:',
            },
            {
              type: 'steps',
              steps: [
                'nodeName — name of the node (freetext)',
                'represents — primary node identifier (string)',
                'alias — alternative node identifier(s) (string)',
              ],
            },
            {
              type: 'note',
              content:
                'When running a neighborhood query (rather than a network search), all text-containing node attribute values are also indexed, so you can query by any text node attribute.',
            },
          ],
        },

        {
          title: 'View a Network',
          blocks: [
            {
              type: 'text',
              content:
                'Click a network in the search results to open it. The network page shows the graphic rendering on the left and an info panel on the right with the description, references, and properties.',
            },
            {
              type: 'image',
              image: {
                src: networkView,
                alt: 'Network page with graphic view and info panel',
              },
            },
            {
              type: 'steps',
              steps: [
                'Scroll the info panel to see description, reference info, and network properties',
                'Use the Table button (bottom right) to switch between graphic and tabular views',
                'Toggle back to the graphic view with the same button',
              ],
            },
          ],
        },

        {
          title: 'Run a Neighborhood Query',
          blocks: [
            {
              type: 'text',
              content:
                'Network queries find a sub-network — a group of nodes and their connecting edges — based on query terms you provide. Use this to focus on a specific gene, protein, or set of identifiers within a larger network.',
            },
            {
              type: 'image',
              image: {
                src: queryRunner,
                alt: 'Query input bar with type selector and Run Query button',
              },
            },
            {
              type: 'steps',
              steps: [
                'Type one or more query terms (e.g. a gene name) in the query box',
                'Choose a query type from the dropdown',
                'Click Run Query',
              ],
            },
          ],
        },

        {
          title: 'Query Types',
          blocks: [
            {
              type: 'steps',
              steps: [
                'Neighborhood — all nodes connected to the query term(s) and all edges between those nodes',
                'Adjacent — all nodes connected to the query term(s), but only edges between those nodes and the query term(s)',
                'Direct — all edges between the query terms (requires at least 2 terms or wildcards)',
                'Interconnect — all edges connecting the query terms, including up to one intermediate node (requires at least 2 terms or wildcards)',
              ],
            },
            {
              type: 'image',
              image: {
                src: queryTypes,
                alt: 'Query type selector dropdown',
              },
            },
          ],
        },

        {
          title: 'Working with Query Results',
          blocks: [
            {
              type: 'text',
              content:
                'A query returns a sub-network you can inspect, save, or open in Cytoscape. Results show the matched nodes and edges in the same graphic and tabular views as a regular network page.',
            },
            {
              type: 'image',
              image: {
                src: queryResult,
                alt: 'Query result sub-network with info panel',
              },
            },
            {
              type: 'steps',
              steps: [
                'Inspect nodes and edges in the graph or in tabular view',
                'Download the result as a tab-separated text file',
                'Click Back to Original Network to clear the result',
                'If logged in, save the result to your NDEx account',
                'Open the result in Cytoscape for further analysis',
              ],
            },
          ],
        },
      ]}
    />
  )
}