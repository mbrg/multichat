import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Settings from '../Settings'

// Mock child components to avoid their async operations
vi.mock('../SystemInstructionsPanel', () => ({
  default: () => (
    <div data-testid="system-instructions-panel">System Instructions Panel</div>
  ),
}))

vi.mock('../TemperaturesPanel', () => ({
  default: () => <div data-testid="temperatures-panel">Temperatures Panel</div>,
}))

// Mock CloudSettings
const mockSystemInstructions = [
  {
    id: 'default',
    name: 'default',
    content: 'You are a helpful AI assistant.',
    enabled: true,
  },
]

const mockTemperatures = [
  {
    id: 'default',
    value: 0.7,
  },
]

vi.mock('../../utils/cloudSettings', () => ({
  CloudSettings: {
    getSystemInstructions: vi.fn(() => Promise.resolve(mockSystemInstructions)),
    getTemperatures: vi.fn(() => Promise.resolve(mockTemperatures)),
    setSystemInstructions: vi.fn(() => Promise.resolve()),
    setTemperatures: vi.fn(() => Promise.resolve()),
    resetToDefaults: vi.fn(() => Promise.resolve()),
  },
}))

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
const mockClearAllKeys = vi.fn()

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
    validationStatus: {
      openai: 'valid',
      anthropic: null,
      google: null,
      mistral: null,
      together: null,
    },
    isLoading: false,
    isAuthenticated: true,
    saveApiKey: mockSaveApiKey,
    clearApiKey: mockClearApiKey,
    toggleProvider: mockToggleProvider,
    getApiKey: mockGetApiKey,
    clearAllKeys: mockClearAllKeys,
    validateApiKey: vi.fn(),
  }),
}))

// Mock useAuthPopup
vi.mock('../../hooks/useAuthPopup', () => ({
  useAuthPopup: () => ({
    isPopupOpen: false,
    checkAuthAndRun: vi.fn(),
    closePopup: vi.fn(),
  }),
}))

// Mock Next.js Image component
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

  it('renders settings modal when open', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    expect(screen.getByText('API Keys')).toBeInTheDocument()
    expect(screen.getByText('🔑')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Settings isOpen={false} onClose={() => {}} />)

    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const mockOnClose = vi.fn()
    await act(async () => {
      render(<Settings isOpen={true} onClose={mockOnClose} />)
    })

    await act(async () => {
      const closeButton = screen.getByText('×')
      fireEvent.click(closeButton)
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const mockOnClose = vi.fn()
    await act(async () => {
      render(<Settings isOpen={true} onClose={mockOnClose} />)
    })

    await act(async () => {
      const backdrop = screen.getByText('API Keys').closest('div')
        ?.parentElement?.parentElement
      fireEvent.click(backdrop!)
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('shows configured API keys in list', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    // Should show OpenAI as configured (from mock hook returning '***')
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Valid API key')).toBeInTheDocument()
  })

  it('shows add form when add button is clicked', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    await act(async () => {
      const addButton = screen.getByText('+ Add Key')
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Add New API Key')).toBeInTheDocument()
      expect(screen.getByText('Select Provider')).toBeInTheDocument()
    })
  })

  it('toggles provider when switch is clicked', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    await act(async () => {
      // Find the toggle switches for configured providers
      const toggles = screen
        .getAllByRole('button')
        .filter((button) => button.className.includes('w-10 h-5'))

      fireEvent.click(toggles[0]) // Click first toggle (OpenAI)
    })

    expect(mockToggleProvider).toHaveBeenCalledWith('openai')
  })

  it('shows provider cards in add form', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    await act(async () => {
      const addButton = screen.getByText('+ Add Key')
      fireEvent.click(addButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('Mistral')).toBeInTheDocument()
      expect(screen.getByText('Together')).toBeInTheDocument()
    })
  })

  it('calls clearApiKey when remove button is clicked', async () => {
    await act(async () => {
      render(<Settings isOpen={true} onClose={() => {}} />)
    })

    await act(async () => {
      // Find the remove button for the configured OpenAI key
      const removeButtons = screen.getAllByTitle('Remove API key')
      fireEvent.click(removeButtons[0])
    })

    expect(mockClearApiKey).toHaveBeenCalledWith('openai')
  })

  it('opens to system instructions section when specified', async () => {
    await act(async () => {
      render(
        <Settings
          isOpen={true}
          onClose={() => {}}
          initialSection="system-instructions"
        />
      )
    })

    // Check for presence of system instructions header and panel
    expect(screen.getByText('System Instructions')).toBeInTheDocument()
    expect(screen.getByTestId('system-instructions-panel')).toBeInTheDocument()
  })

  it('opens to temperatures section when specified', async () => {
    await act(async () => {
      render(
        <Settings
          isOpen={true}
          onClose={() => {}}
          initialSection="temperatures"
        />
      )
    })

    // Check for presence of temperatures header and panel
    expect(screen.getByText('Temperatures')).toBeInTheDocument()
    expect(screen.getByTestId('temperatures-panel')).toBeInTheDocument()
  })
})
