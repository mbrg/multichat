import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useSession, signIn, signOut } from 'next-auth/react'
import LoginButton from '../LoginButton'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

describe('LoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('displays loading spinner when status is loading', () => {
      ;(useSession as any).mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(<LoginButton />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      // Check for the spinner element by class
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('authenticated state', () => {
    it('displays user info and sign out button when authenticated', () => {
      const mockSession = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      }

      ;(useSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<LoginButton />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'John Doe' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })

    it('displays email when name is not available', () => {
      const mockSession = {
        user: {
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      }

      ;(useSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<LoginButton />)
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('calls signOut when sign out button is clicked', () => {
      const mockSession = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      }

      ;(useSession as any).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      })

      render(<LoginButton />)
      
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      fireEvent.click(signOutButton)
      
      expect(signOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('unauthenticated state', () => {
    it('displays GitHub and Google sign-in buttons when not authenticated', () => {
      ;(useSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<LoginButton />)
      
      expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    })

    it('calls signIn with github provider when GitHub button is clicked', () => {
      ;(useSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<LoginButton />)
      
      const githubButton = screen.getByRole('button', { name: /sign in with github/i })
      fireEvent.click(githubButton)
      
      expect(signIn).toHaveBeenCalledWith('github')
    })

    it('calls signIn with google provider when Google button is clicked', () => {
      ;(useSession as any).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<LoginButton />)
      
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      fireEvent.click(googleButton)
      
      expect(signIn).toHaveBeenCalledWith('google')
    })
  })
})