import useSWR from 'swr'
import { useConfig } from '@/lib/contexts/ConfigContext'
import { NDExUser } from '@js4cytoscape/ndex-client'
import { getNdexClient } from '../lib/api/ndex-client-manager'

export function useUser(uuid: string) {
  const config = useConfig()
  const { ndexBaseUrl } = config
  const ndexClient = getNdexClient(ndexBaseUrl)

  // Use uuid as the key and ndexClient.user.getUser as fetcher.
  const { data, error, isLoading } = useSWR<NDExUser>(uuid, () =>
    ndexClient.user.getUser(uuid),
  )

  return {
    user: data,
    isLoading,
    error: error?.message || null,
  }
}
