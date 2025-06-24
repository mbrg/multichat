import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import Menu from '../Menu'
import { useAuthPopup } from '../../hooks/useAuthPopup'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../hooks/useAuthPopup', () => ({
  useAuthPopup: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  ),
}))

describe('Menu', () => {
  const mockOnOpenSettings = vi.fn()
  const mockOnOpenSystemInstructions = vi.fn()
  const mockCheckAuthAndRun = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthPopup as any).mockReturnValue({
      checkAuthAndRun: mockCheckAuthAndRun,
    })
  })

  it('renders menu toggle button', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    const menuButton = screen.getByLabelText('Menu')
    expect(menuButton).toBeInTheDocument()
  })

  it('toggles menu visibility when clicked', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    const menuButton = screen.getByLabelText('Menu')

    // Menu should not be visible initially
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
    expect(screen.queryByText('System Instructions')).not.toBeInTheDocument()

    // Click to open menu
    fireEvent.click(menuButton)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('System Instructions')).toBeInTheDocument()

    // Click to close menu
    fireEvent.click(menuButton)
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
    expect(screen.queryByText('System Instructions')).not.toBeInTheDocument()
  })

  it('shows sign in button when not authenticated', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))

    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })

  it('shows user info and sign out button when authenticated', () => {
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    }
    ;(useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByAltText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('handles API Keys click when authenticated', async () => {
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    }
    ;(useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('API Keys'))

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1)
    expect(mockCheckAuthAndRun).not.toHaveBeenCalled()

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
    })
  })

  it('handles API Keys click when not authenticated', async () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('API Keys'))

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1)
    expect(mockCheckAuthAndRun).not.toHaveBeenCalled()

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
    })
  })

  it('handles System Instructions click', async () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('System Instructions'))

    expect(mockOnOpenSystemInstructions).toHaveBeenCalledTimes(1)

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('System Instructions')).not.toBeInTheDocument()
    })
  })

  it('handles sign in click', async () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Sign in'))

    expect(mockCheckAuthAndRun).toHaveBeenCalledTimes(1)

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
    })
  })

  it('handles sign out click', async () => {
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    }
    ;(useSession as any).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Sign out'))

    expect(signOut).toHaveBeenCalledTimes(1)

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    ;(useSession as any).mockReturnValue({ data: null, status: 'loading' })

    render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu'))

    // Should show loading spinner
    const spinner = screen.getByTestId('loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('closes menu when clicking outside', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <div>
        <Menu
          onOpenSettings={mockOnOpenSettings}
          onOpenSystemInstructions={mockOnOpenSystemInstructions}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    expect(screen.getByText('API Keys')).toBeInTheDocument()

    // Click outside
    fireEvent.click(screen.getByTestId('outside'))

    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const { container } = render(
      <Menu
        onOpenSettings={mockOnOpenSettings}
        onOpenSystemInstructions={mockOnOpenSystemInstructions}
        className="custom-class"
      />
    )

    const menuContainer = container.querySelector('.custom-class')
    expect(menuContainer).toBeInTheDocument()
  })
})
