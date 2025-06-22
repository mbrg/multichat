import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Settings from '../Settings'

// Mock the useApiKeys hook
const mockSaveApiKey = vi.fn()
const mockToggleProvider = vi.fn()
const mockGetApiKey = vi.fn()

vi.mock('../../hooks/useApiKeys', () => ({
  useApiKeys: () => ({
    apiKeys: {
      openai: 'sk-test-key',
      anthropic: ''
    },
    enabledProviders: {
      openai: true,
      anthropic: false,
      google: true,
      mistral: true,
      together: true
    },
    isLoading: false,
    saveApiKey: mockSaveApiKey,
    toggleProvider: mockToggleProvider,
    getApiKey: mockGetApiKey
  })
}))

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    })
    
    mockGetApiKey.mockImplementation((provider: string) => {
      if (provider === 'openai') return 'sk-test-key'
      return ''
    })
  })

  it('renders settings modal when open', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('API Configuration')).toBeInTheDocument()
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByText('Anthropic API Key')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Settings isOpen={false} onClose={() => {}} />)
    
    expect(screen.queryByText('API Configuration')).not.toBeInTheDocument()
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
    
    const backdrop = screen.getByText('API Configuration').closest('div')?.parentElement?.parentElement
    fireEvent.click(backdrop!)
    
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('displays API key values from hook', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    const openaiInput = screen.getByPlaceholderText('sk-...')
    expect(openaiInput).toHaveValue('sk-test-key')
  })

  it('calls saveApiKey when API key input changes', async () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    const anthropicInput = screen.getByPlaceholderText('sk-ant-...')
    fireEvent.change(anthropicInput, { target: { value: 'sk-ant-new-key' } })
    
    await waitFor(() => {
      expect(mockSaveApiKey).toHaveBeenCalledWith('anthropic', 'sk-ant-new-key')
    })
  })

  it('toggles provider when switch is clicked', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    // Find the toggle switches - there should be 5 (one for each provider)
    const toggles = screen.getAllByRole('button').filter(button => 
      button.className.includes('w-11 h-6')
    )
    
    fireEvent.click(toggles[0]) // Click first toggle (OpenAI)
    
    expect(mockToggleProvider).toHaveBeenCalledWith('openai')
  })

  it('renders all provider sections', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument()
    expect(screen.getByText('Anthropic API Key')).toBeInTheDocument()
    expect(screen.getByText('Google API Key')).toBeInTheDocument()
    expect(screen.getByText('Mistral API Key')).toBeInTheDocument()
    expect(screen.getByText('Together API Key')).toBeInTheDocument()
  })

  it('renders system prompt section', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    expect(screen.getByText('System Prompt')).toBeInTheDocument()
  })

  it('manages system prompt setting', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    const systemPromptTextarea = screen.getByRole('textbox')
    
    fireEvent.change(systemPromptTextarea, { 
      target: { value: 'Custom system prompt' } 
    })
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith('systemPrompt', 'Custom system prompt')
  })


  it('displays character count for system prompt', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    // Should show initial count
    expect(screen.getByText(/\/ 1000/)).toBeInTheDocument()
  })

  it('shows correct toggle states based on enabled providers', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    // OpenAI should be enabled (has bg-[#667eea])
    const toggles = screen.getAllByRole('button').filter(button => 
      button.className.includes('w-11 h-6')
    )
    
    // First toggle should be enabled (OpenAI)
    expect(toggles[0]).toHaveClass('bg-[#667eea]')
    
    // Second toggle should be disabled (Anthropic)
    expect(toggles[1]).toHaveClass('bg-[#2a2a2a]')
  })

  it('renders provider icons', () => {
    render(<Settings isOpen={true} onClose={() => {}} />)
    
    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThanOrEqual(5) // At least 5 provider icons
  })

  it('prevents backdrop clicks on content', () => {
    const mockOnClose = vi.fn()
    render(<Settings isOpen={true} onClose={mockOnClose} />)
    
    const content = screen.getByText('API Configuration').closest('div')
    fireEvent.click(content!)
    
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})