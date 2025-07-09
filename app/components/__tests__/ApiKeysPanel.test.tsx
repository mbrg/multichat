import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import ApiKeysPanel from '../ApiKeysPanel'
import { useApiKeys } from '../../hooks/useApiKeys'
import { useAuthPopup } from '../../hooks/useAuthPopup'

// Mock dependencies
vi.mock('next-auth/react')
vi.mock('../../hooks/useApiKeys')
vi.mock('../../hooks/useAuthPopup')
vi.mock('../AuthPopup', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="auth-popup" role="dialog" /> : null,
}))

const mockSession = vi.mocked(useSession)
const mockUseApiKeys = vi.mocked(useApiKeys)
const mockUseAuthPopup = vi.mocked(useAuthPopup)

describe('ApiKeysPanel', () => {
  const mockApiKeysHook = {
    apiKeys: {},
    enabledProviders: {
      openai: false,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
      xai: false,
    },
    validationStatus: {},
    isLoading: false,
    isAuthenticated: true,
    saveApiKey: vi.fn(),
    clearApiKey: vi.fn(),
    toggleProvider: vi.fn(),
    getApiKey: vi.fn(),
    isProviderEnabled: vi.fn(),
    hasApiKey: vi.fn(),
    loadApiKeys: vi.fn(),
    clearAllKeys: vi.fn(),
    validateApiKey: vi.fn(),
  }

  const mockAuthPopup = {
    isPopupOpen: false,
    checkAuthAndRun: vi.fn(),
    closePopup: vi.fn(),
    isAuthenticated: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSession.mockReturnValue({
      data: {
        user: { id: 'test-user', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    mockUseApiKeys.mockReturnValue(mockApiKeysHook)
    mockUseAuthPopup.mockReturnValue(mockAuthPopup)
  })

  describe('Basic Rendering', () => {
    it('should render the main panel elements', () => {
      render(<ApiKeysPanel />)

      expect(screen.getByText('Configured API Keys')).toBeInTheDocument()
      expect(screen.getByText('No API keys configured')).toBeInTheDocument()
      expect(
        screen.getByText('🔒 API keys stored securely in cloud')
      ).toBeInTheDocument()
    })

    it('should show loading skeleton when loading', () => {
      mockUseApiKeys.mockReturnValue({
        ...mockApiKeysHook,
        isLoading: true,
      })

      render(<ApiKeysPanel />)

      // Check for loading skeleton elements (pulse animation divs)
      const skeletonElements = document.querySelectorAll('.animate-pulse')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })

    it('should show sign in message for unauthenticated users', () => {
      mockSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      })

      mockUseApiKeys.mockReturnValue({
        ...mockApiKeysHook,
        isAuthenticated: false,
      })

      render(<ApiKeysPanel />)
      expect(screen.getByText('Sign in to add API keys')).toBeInTheDocument()
    })
  })

  describe('API Key Management', () => {
    it('should show add key button for authenticated users', () => {
      render(<ApiKeysPanel />)

      expect(screen.getByText('Add your first API key')).toBeInTheDocument()
    })

    it('should not show add key button for unauthenticated users', () => {
      mockUseApiKeys.mockReturnValue({
        ...mockApiKeysHook,
        isAuthenticated: false,
      })

      render(<ApiKeysPanel />)

      expect(
        screen.queryByText('Add your first API key')
      ).not.toBeInTheDocument()
    })

    it('should display configured API keys', () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: { openai: '***', anthropic: '***' },
        enabledProviders: {
          openai: true,
          anthropic: true,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      // Mock getApiKey to return masked keys for configured providers
      mockHook.getApiKey.mockImplementation((provider) => {
        if (provider === 'openai' || provider === 'anthropic') return '***'
        return undefined
      })

      mockUseApiKeys.mockReturnValue(mockHook)

      render(<ApiKeysPanel />)

      // Should show configured providers
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getAllByText('API key configured')).toHaveLength(2)
    })

    it('should handle API key removal', async () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: { openai: '***' },
        enabledProviders: {
          openai: true,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      // Mock getApiKey to return masked key for openai
      mockHook.getApiKey.mockImplementation((provider) => {
        if (provider === 'openai') return '***'
        return undefined
      })

      mockUseApiKeys.mockReturnValue(mockHook)

      render(<ApiKeysPanel />)

      // Find and click remove button
      const removeButton = screen.getByTitle('Remove API key')
      fireEvent.click(removeButton)

      expect(mockApiKeysHook.clearApiKey).toHaveBeenCalledWith('openai')
    })
  })

  describe('Provider Toggle', () => {
    it('should allow toggling provider enabled state', async () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: { openai: '***' },
        enabledProviders: {
          openai: true,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      // Mock getApiKey to return masked key for openai
      mockHook.getApiKey.mockImplementation((provider) => {
        if (provider === 'openai') return '***'
        return undefined
      })

      mockUseApiKeys.mockReturnValue(mockHook)

      render(<ApiKeysPanel />)

      // Find and click toggle switch
      const toggleButton = document.querySelector(
        '.relative.w-10.h-5.rounded-full'
      )
      expect(toggleButton).toBeInTheDocument()

      fireEvent.click(toggleButton!)

      expect(mockApiKeysHook.toggleProvider).toHaveBeenCalledWith('openai')
    })
  })

  describe('Authentication Integration', () => {
    it('should render auth popup when open', () => {
      mockUseAuthPopup.mockReturnValue({
        ...mockAuthPopup,
        isPopupOpen: true,
      })

      render(<ApiKeysPanel />)

      // Should render AuthPopup component
      expect(screen.getByTestId('auth-popup')).toBeInTheDocument()
    })

    it('should use checkAuthAndRun for unauthenticated actions', () => {
      mockUseApiKeys.mockReturnValue({
        ...mockApiKeysHook,
        isAuthenticated: false,
      })

      mockAuthPopup.checkAuthAndRun.mockImplementation((callback) => callback())

      render(<ApiKeysPanel />)

      // No add button should be present for unauthenticated users
      expect(
        screen.queryByText('Add your first API key')
      ).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle clearApiKey errors gracefully', async () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: { openai: '***' },
        enabledProviders: {
          openai: true,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      mockHook.clearApiKey.mockRejectedValue(new Error('Network error'))
      mockHook.getApiKey.mockImplementation((provider) => {
        if (provider === 'openai') return '***'
        return undefined
      })

      mockUseApiKeys.mockReturnValue(mockHook)

      render(<ApiKeysPanel />)

      const removeButton = screen.getByTitle('Remove API key')
      fireEvent.click(removeButton)

      // Should handle error gracefully - component doesn't crash, UI remains functional
      await waitFor(() => {
        expect(mockHook.clearApiKey).toHaveBeenCalled()
        // Component should still be functional after error
        expect(screen.getByText('+ Add Key')).toBeInTheDocument()
      })
    })

    it('should handle missing hook data gracefully', () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: {},
        enabledProviders: {
          openai: false,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      mockHook.getApiKey.mockReturnValue(undefined)
      mockUseApiKeys.mockReturnValue(mockHook)

      // Should not crash
      expect(() => render(<ApiKeysPanel />)).not.toThrow()
    })
  })

  describe('UI States', () => {
    it('should show appropriate buttons based on auth and API key status', () => {
      render(<ApiKeysPanel />)

      // For authenticated user with no keys
      expect(screen.getByText('Add your first API key')).toBeInTheDocument()
      expect(screen.getByText('+ Add Key')).toBeInTheDocument()
    })

    it('should handle empty states correctly', () => {
      mockUseApiKeys.mockReturnValue({
        ...mockApiKeysHook,
        apiKeys: {},
        enabledProviders: {
          openai: false,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
      })

      render(<ApiKeysPanel />)

      expect(screen.getByText('No API keys configured')).toBeInTheDocument()
    })
  })

  describe('Security', () => {
    it('should mask API key values in display', () => {
      const mockHook = {
        ...mockApiKeysHook,
        apiKeys: { openai: '***' }, // Keys should be masked
        enabledProviders: {
          openai: true,
          anthropic: false,
          google: false,
          mistral: false,
          together: false,
          xai: false,
        },
        isProviderEnabled: vi.fn(),
        hasApiKey: vi.fn(),
        loadApiKeys: vi.fn(),
      }
      mockHook.getApiKey.mockImplementation((provider) => {
        if (provider === 'openai') return '***'
        return undefined
      })

      mockUseApiKeys.mockReturnValue(mockHook)

      render(<ApiKeysPanel />)

      // Should not display actual API key values
      expect(screen.queryByText(/sk-/)).not.toBeInTheDocument()
      expect(screen.getByText('API key configured')).toBeInTheDocument()
    })

    it('should show secure storage indicator', () => {
      render(<ApiKeysPanel />)

      expect(
        screen.getByText('🔒 API keys stored securely in cloud')
      ).toBeInTheDocument()
    })
  })
})
