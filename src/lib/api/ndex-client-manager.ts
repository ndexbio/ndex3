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
  // A tokenless call intentionally leaves any existing auth in place. This
  // client is a shared singleton: wiping auth here would let an anonymous data
  // fetch (e.g. user lookup) strip the token out from under a concurrent
  // authenticated request that holds the same instance across awaits (e.g. the
  // breadcrumb parent-walk). Callers that need explicit auth behaviour (e.g.
  // public search, where the token affects server-side ranking) should pass the
  // token explicitly. The token is only cleared on logout, which is a full page
  // reload that rebuilds the singleton.

  return ndexClient
}
