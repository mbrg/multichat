import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import Menu from '../Menu'
import { useAuthPopup } from '../../hooks/useAuthPopup'
import { useApiKeys } from '../../hooks/useApiKeys'
import { CloudSettings } from '../../utils/cloudSettings'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../hooks/useAuthPopup', () => ({
  useAuthPopup: vi.fn(),
}))

vi.mock('../../hooks/useApiKeys', () => ({
  useApiKeys: vi.fn(() => ({
    getApiKey: vi.fn((provider: string) => {
      if (provider === 'openai') return '***'
      return undefined
    }),
    hasApiKey: vi.fn((provider: string) => {
      return provider === 'openai'
    }),
  })),
}))

vi.mock('../../utils/cloudSettings', () => ({
  CloudSettings: {
    getSystemInstructions: vi.fn(() =>
      Promise.resolve([
        { id: '1', name: 'default', content: 'Be helpful', enabled: true },
      ])
    ),
    getTemperatures: vi.fn(() => Promise.resolve([{ id: '1', value: 0.7 }])),
  },
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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    const menuButton = screen.getByLabelText('Menu')
    expect(menuButton).toBeInTheDocument()
  })

  it('toggles menu visibility when clicked', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    const menuButton = screen.getByLabelText('Menu')

    // Menu should not be visible initially
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()

    // Click to open menu
    fireEvent.click(menuButton)
    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    // Click to close menu
    fireEvent.click(menuButton)
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
  })

  it('shows sign in button when not authenticated', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))

    expect(screen.getByText('Sign In')).toBeInTheDocument()
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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByAltText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('API Keys'))

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1)
    expect(mockOnOpenSettings).toHaveBeenCalledWith('api-keys')
    expect(mockCheckAuthAndRun).not.toHaveBeenCalled()

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
    })
  })

  it('handles System Instructions click when not authenticated', async () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('System Instructions'))

    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1)
    expect(mockOnOpenSettings).toHaveBeenCalledWith('system-instructions')
    expect(mockCheckAuthAndRun).not.toHaveBeenCalled()

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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))
    fireEvent.click(screen.getByText('Sign In'))

    expect(mockCheckAuthAndRun).toHaveBeenCalledTimes(1)

    // Menu should close after clicking
    await waitFor(() => {
      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

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

    render(<Menu onOpenSettings={mockOnOpenSettings} />)

    fireEvent.click(screen.getByLabelText('Menu'))

    // Should show loading skeleton
    const loadingSkeleton = document.querySelector('.animate-pulse')
    expect(loadingSkeleton).toBeInTheDocument()
    expect(loadingSkeleton).toHaveClass('animate-pulse')
  })

  it('closes menu when clicking outside', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <div>
        <Menu onOpenSettings={mockOnOpenSettings} />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    fireEvent.click(screen.getByLabelText('Menu'))
    expect(screen.getByText('Settings')).toBeInTheDocument()

    // Click outside
    fireEvent.click(screen.getByTestId('outside'))

    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    ;(useSession as any).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    const { container } = render(
      <Menu onOpenSettings={mockOnOpenSettings} className="custom-class" />
    )

    const menuContainer = container.querySelector('.custom-class')
    expect(menuContainer).toBeInTheDocument()
  })
})
