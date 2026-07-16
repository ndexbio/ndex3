import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NDExFileType } from '@js4cytoscape/ndex-client'
import NetworksList from './NetworksList'

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
}))

jest.mock('@/lib/contexts/ConfigContext', () => ({
  useConfig: () => ({ ndexBaseUrl: 'test.ndexbio.org' }),
}))

jest.mock('@/lib/contexts/KeycloakContext', () => ({
  useAuth: () => ({ user: null }),
}))

const network = {
  uuid: 'network-1',
  name: 'Shared Network',
  type: NDExFileType.NETWORK,
  owner: 'alice',
  modificationTime: 0,
  attributes: {},
}

describe('NetworksList access-key propagation', () => {
  it('adds the page access key to the viewer URL on double-click', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <NetworksList
        items={[network]}
        viewMode="list"
        readOnly
        accessKey="shared key/+"
      />,
    )

    fireEvent.doubleClick(screen.getByText('Shared Network').closest('tr')!)

    expect(openSpy).toHaveBeenCalledWith(
      'https://test.ndexbio.org/viewer/networks/network-1?accesskey=shared%20key%2F%2B',
      '_blank',
    )
    openSpy.mockRestore()
  })
})
