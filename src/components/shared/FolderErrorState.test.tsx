import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FolderErrorState from './FolderErrorState'

describe('FolderErrorState', () => {
  it('forbidden + anonymous: sign-in prompt and button', () => {
    const onSignIn = jest.fn()
    render(
      <FolderErrorState variant="forbidden" isAuthenticated={false} onSignIn={onSignIn} />,
    )

    expect(
      screen.getByText("You don't have permission to view this folder"),
    ).toBeInTheDocument()
    expect(screen.getByText(/sign in if it was shared/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onSignIn).toHaveBeenCalled()
  })

  it('forbidden + signed-in: no sign-in button, ask-the-owner copy', () => {
    render(<FolderErrorState variant="forbidden" isAuthenticated />)

    expect(
      screen.getByText(/ask the owner for access/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('notFound: folder-does-not-exist copy', () => {
    render(<FolderErrorState variant="notFound" />)
    expect(screen.getByText("This folder doesn't exist")).toBeInTheDocument()
    expect(screen.getByText(/may have been deleted/i)).toBeInTheDocument()
  })

  it('generic: falls back to the provided message', () => {
    render(<FolderErrorState variant="generic" message="Server exploded" />)
    expect(screen.getByText('Error loading content')).toBeInTheDocument()
    expect(screen.getByText('Server exploded')).toBeInTheDocument()
  })
})
