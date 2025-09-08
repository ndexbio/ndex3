import { NDExClient } from '@js4cytoscape/ndex-client'

const DEF_URL = 'https://ndexbio.org'
let ndexClient: NDExClient = new NDExClient({ baseURL: DEF_URL })

export const getNdexClient = (url: string, accessToken?: string): NDExClient => {
  // Ensure URL has protocol
  const fullUrl = url && url.startsWith('http') ? url : `https://${url || 'ndexbio.org'}`
  
  if (!url || url === '') {
    ndexClient = new NDExClient({ baseURL: DEF_URL })
  } else if (fullUrl !== ndexClient.getConfig().baseURL) {
    ndexClient = new NDExClient({ baseURL: fullUrl })
  }

  if (accessToken) {
    ndexClient.updateConfig({
      auth: { type: 'oauth', idToken: accessToken }
    })
  }
  
  return ndexClient
}
