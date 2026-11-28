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

/**
 * Amber marks anything DOI-related and the shape carries the state; grey stays
 * plain read-only. The two locks differ only in colour, so each icon's title is
 * the only thing that distinguishes them for a screen reader or in greyscale —
 * see docs/decisions/0006.
 */
describe('NetworksList DOI status icons', () => {
  const renderWith = (extra: Record<string, unknown>) =>
    render(<NetworksList items={[{ ...network, ...extra }]} viewMode="list" readOnly />)

  it('shows the trophy only once the network is certified', () => {
    renderWith({ doi: '10.18119/N9TEST', isCertified: true, isReadOnly: true })
    expect(screen.getByTitle('Published network with DOI')).toBeInTheDocument()
  })

  // A minted DOI is not publication: a pre-certified network may still be private.
  it('does not claim publication for a pre-certified network', () => {
    renderWith({ doi: '10.18119/N9TEST', isCertified: false, isReadOnly: true })

    expect(screen.queryByTitle('Published network with DOI')).not.toBeInTheDocument()
    expect(
      screen.getByTitle('Locked — DOI requested, reference not yet added'),
    ).toBeInTheDocument()
  })

  it('marks a failed mint distinctly from a plain lock', () => {
    renderWith({ doi: 'Pending', isCertified: false, isReadOnly: true })

    expect(
      screen.getByTitle('DOI request failed — cancel the request and try again'),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('Read-only network')).not.toBeInTheDocument()
  })

  // A "certify now" request whose mint failed is left with certified=true and
  // doi="Pending". Before the certified predicate required a real DOI, this row
  // showed a trophy claiming publication *and* a failure badge at the same time.
  it('shows only the failure badge when a certify-now mint failed', () => {
    renderWith({ doi: 'Pending', isCertified: true, isReadOnly: true })

    expect(
      screen.getByTitle('DOI request failed — cancel the request and try again'),
    ).toBeInTheDocument()
    expect(screen.queryByTitle('Published network with DOI')).not.toBeInTheDocument()
    expect(
      screen.queryByTitle('Locked — DOI requested, reference not yet added'),
    ).not.toBeInTheDocument()
  })

  it('keeps the grey lock for read-only without a DOI', () => {
    renderWith({ isReadOnly: true })

    expect(screen.getByTitle('Read-only network')).toBeInTheDocument()
    expect(screen.queryByTitle('Published network with DOI')).not.toBeInTheDocument()
  })

  it('shows no status icon for an ordinary network', () => {
    renderWith({})

    for (const title of [
      'Published network with DOI',
      'Locked — DOI requested, reference not yet added',
      'DOI request failed — cancel the request and try again',
      'Read-only network',
    ]) {
      expect(screen.queryByTitle(title)).not.toBeInTheDocument()
    }
  })
})
