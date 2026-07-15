import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { OwnerCell } from './OwnerCell'

// Mock next/link to a plain anchor so we can assert directly against DOM
// attributes and don't need the Next router in the test environment.
jest.mock('next/link', () => ({
  __esModule: true,
  default: function MockLink({ children, href, ...rest }: any) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    )
  },
}))

describe('OwnerCell', () => {
  describe('when owner is missing', () => {
    it('renders "Me" as a fallback when not readOnly', () => {
      render(
        <OwnerCell owner={null} ownerUUID={null} currentUserName="testuser" />
      )
      expect(screen.getByTestId('owner-cell')).toHaveTextContent('Me')
      expect(screen.queryByTestId('owner-link')).not.toBeInTheDocument()
    })

    it('renders empty when readOnly (nothing to attribute)', () => {
      render(
        <OwnerCell
          owner={null}
          ownerUUID={null}
          currentUserName="testuser"
          readOnly
        />
      )
      const cell = screen.getByTestId('owner-cell')
      expect(cell.textContent).toBe('')
      expect(screen.queryByTestId('owner-link')).not.toBeInTheDocument()
    })

    it('treats undefined owner the same as null', () => {
      render(<OwnerCell currentUserName="testuser" />)
      expect(screen.getByTestId('owner-cell')).toHaveTextContent('Me')
    })
  })

  describe('when owner is the current user', () => {
    it('renders plain text with the owner name, not a link', () => {
      render(
        <OwnerCell
          owner="testuser"
          ownerUUID="uuid-testuser-9999"
          currentUserName="testuser"
        />
      )
      expect(screen.getByTestId('owner-cell')).toHaveTextContent('testuser')
      expect(screen.queryByTestId('owner-link')).not.toBeInTheDocument()
    })

    it('does not link even when a valid ownerUUID is present', () => {
      // Explicit regression guard: the "is current user" check must take
      // precedence over having a linkable UUID.
      render(
        <OwnerCell
          owner="testuser"
          ownerUUID="uuid-testuser-9999"
          currentUserName="testuser"
        />
      )
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })

  describe('when ownerUUID is missing (older record)', () => {
    it('renders the owner as plain text with no link', () => {
      render(
        <OwnerCell
          owner="carol"
          ownerUUID={null}
          currentUserName="testuser"
        />
      )
      expect(screen.getByTestId('owner-cell')).toHaveTextContent('carol')
      expect(screen.queryByTestId('owner-link')).not.toBeInTheDocument()
    })

    it('treats empty string ownerUUID as missing (defensive)', () => {
      render(
        <OwnerCell owner="carol" ownerUUID="" currentUserName="testuser" />
      )
      expect(screen.queryByTestId('owner-link')).not.toBeInTheDocument()
      expect(screen.getByTestId('owner-cell')).toHaveTextContent('carol')
    })
  })

  describe('when owner is a different user with a UUID', () => {
    it('renders a link to /users/<ownerUUID> with the owner name as text', () => {
      render(
        <OwnerCell
          owner="alice"
          ownerUUID="uuid-alice-1234"
          currentUserName="testuser"
        />
      )
      const link = screen.getByTestId('owner-link')
      expect(link).toHaveAttribute('href', '/users/uuid-alice-1234')
      expect(link).toHaveTextContent('alice')
    })

    it('renders as a link for anonymous viewers (currentUserName null)', () => {
      // Anonymous is the common case for public search results — every
      // non-null owner should link since there's no "self" to exclude.
      render(
        <OwnerCell
          owner="alice"
          ownerUUID="uuid-alice-1234"
          currentUserName={null}
        />
      )
      expect(screen.getByTestId('owner-link')).toHaveAttribute(
        'href',
        '/users/uuid-alice-1234'
      )
    })

    it('uses UUID for href, not the owner username', () => {
      // Regression guard: don't let anyone "helpfully" swap the slug back
      // to the human-readable username.
      render(
        <OwnerCell
          owner="alice"
          ownerUUID="uuid-alice-1234"
          currentUserName="testuser"
        />
      )
      const href = screen.getByTestId('owner-link').getAttribute('href')
      expect(href).toBe('/users/uuid-alice-1234')
      expect(href).not.toContain('/alice')
    })

    it('stops click propagation so the parent row does not fire onClick', () => {
      // The link lives inside a row that has its own onClick (selection).
      // Clicking the profile link must not also select the row.
      const parentClick = jest.fn()
      render(
        <div onClick={parentClick}>
          <OwnerCell
            owner="alice"
            ownerUUID="uuid-alice-1234"
            currentUserName="testuser"
          />
        </div>
      )
      fireEvent.click(screen.getByTestId('owner-link'))
      expect(parentClick).not.toHaveBeenCalled()
    })

    it('stops double-click propagation so the row dblclick handler does not fire', () => {
      // In the real app the row's onDoubleClick calls window.open() to
      // launch the network viewer. Without stopPropagation, a stray
      // double-click on the profile link would spawn a viewer tab.
      const parentDblClick = jest.fn()
      render(
        <div onDoubleClick={parentDblClick}>
          <OwnerCell
            owner="alice"
            ownerUUID="uuid-alice-1234"
            currentUserName="testuser"
          />
        </div>
      )
      fireEvent.doubleClick(screen.getByTestId('owner-link'))
      expect(parentDblClick).not.toHaveBeenCalled()
    })
  })
})
