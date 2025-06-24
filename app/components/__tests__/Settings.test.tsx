import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Settings from '../Settings'

// Mock next-auth to return authenticated session for these tests
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual,
    useSession: vi.fn(() => ({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
    })),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }
})

// Mock the useApiKeys hook
const mockSaveApiKey = vi.fn()
const mockClearApiKey = vi.fn()
const mockToggleProvider = vi.fn()
const mockGetApiKey = vi.fn()

vi.mock('../../hooks/useApiKeys', () => ({
  useApiKeys: () => ({
    apiKeys: {
      openai: 'sk-test-key',
      anthropic: '',
    },
    enabledProviders: {
      openai: true,
      anthropic: false,
      google: true,
      mistral: true,
      together: true,
    },
    isLoading: false,
    isAuthenticated: true,
    saveApiKey: mockSaveApiKey,
    clearApiKey: mockClearApiKey,
    toggleProvider: mockToggleProvider,
    getApiKey: mockGetApiKey,
  }),
}))

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })

    mockGetApiKey.mockImplementation((provider: string) => {
      if (provider === 'openai') return '***' // Shows as configured
      return undefined // Not configured
    })
  })

  it('renders settings modal when open', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('Configured API Keys')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Settings isOpen={false} onClose={() => {}} />)

    expect(screen.queryByText('API Keys')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn()
    render(<Settings isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const mockOnClose = vi.fn()
    render(<Settings isOpen={true} onClose={mockOnClose} />)

    const backdrop = screen.getByText('API Keys').closest('div')
      ?.parentElement?.parentElement
    fireEvent.click(backdrop!)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('shows configured API keys in list', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    // Should show OpenAI as configured (from mock hook returning '***')
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('API key configured')).toBeInTheDocument()
  })

  it('shows add form when add button is clicked', async () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    const addButton = screen.getByText('+ Add Key')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New API Key')).toBeInTheDocument()
      expect(screen.getByText('Select Provider')).toBeInTheDocument()
    })
  })

  it('toggles provider when switch is clicked', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    // Find the toggle switches for configured providers
    const toggles = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('w-10 h-5'))

    fireEvent.click(toggles[0]) // Click first toggle (OpenAI)

    expect(mockToggleProvider).toHaveBeenCalledWith('openai')
  })

  it('shows provider cards in add form', async () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    const addButton = screen.getByText('+ Add Key')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('Mistral')).toBeInTheDocument()
      expect(screen.getByText('Together')).toBeInTheDocument()
    })
  })

  it('calls clearApiKey when remove button is clicked', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)

    // Find the remove button for the configured OpenAI key
    const removeButtons = screen.getAllByTitle('Remove API key')
    fireEvent.click(removeButtons[0])

    expect(mockClearApiKey).toHaveBeenCalledWith('openai')
  })
})
