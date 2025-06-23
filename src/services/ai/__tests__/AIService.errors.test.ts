import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from '../index'
import type { Message } from '../../../types/ai'

// Mock all the AI SDK modules
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({})),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({})),
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => ({})),
}))

vi.mock('@ai-sdk/mistral', () => ({
  mistral: vi.fn(() => ({})),
}))

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAI: vi.fn(() => ({})),
  createOpenAICompatible: vi.fn(() => vi.fn(() => ({}))),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

// Mock SecureStorage
vi.mock('../../../utils/crypto', () => ({
  SecureStorage: {
    encryptAndStore: vi.fn().mockResolvedValue(undefined),
    decryptAndRetrieve: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('AIService Error Handling User Flows', () => {
  let aiService: AIService
  let mockGenerateText: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let mockSecureStorage: {
    encryptAndStore: ReturnType<typeof vi.fn>
    decryptAndRetrieve: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Spy on console.error to capture and assert error logs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Get the mocked generateText function
    const { generateText } = await import('ai')
    mockGenerateText = generateText as ReturnType<typeof vi.fn>

    // Get the mocked SecureStorage functions
    const { SecureStorage } = await import('../../../utils/crypto')
    mockSecureStorage = {
      encryptAndStore: SecureStorage.encryptAndStore as ReturnType<
        typeof vi.fn
      >,
      decryptAndRetrieve: SecureStorage.decryptAndRetrieve as ReturnType<
        typeof vi.fn
      >,
      remove: SecureStorage.remove as ReturnType<typeof vi.fn>,
    }

    aiService = new AIService()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    vi.restoreAllMocks()
  })

  describe('API Key Validation User Flows', () => {
    it('confirms API key works before users start chatting', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Test response',
        finishReason: 'stop',
      })

      const isValid = await aiService.validateApiKey('openai', 'valid-api-key')

      expect(isValid).toBe(true)
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5,
        })
      )
    })

    it('prevents users from using invalid credentials', async () => {
      const error = new Error('Invalid API key')
      mockGenerateText.mockRejectedValueOnce(error)

      const isValid = await aiService.validateApiKey('openai', 'invalid-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with the expected error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OpenAI API key validation failed:',
        error
      )
    })

    it('verifies Anthropic credentials to ensure service availability', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Claude response',
        finishReason: 'stop',
      })

      const isValid = await aiService.validateApiKey(
        'anthropic',
        'valid-anthropic-key'
      )

      expect(isValid).toBe(true)
      // Assert that console.error was NOT called for successful validation
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('tests Google API access when user configures Gemini', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Gemini response',
        finishReason: 'stop',
      })

      const isValid = await aiService.validateApiKey(
        'google',
        'valid-google-key'
      )

      expect(isValid).toBe(true)
      // Assert that console.error was NOT called for successful validation
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('provides helpful guidance when network connection fails', async () => {
      const error = new Error('Network timeout')
      mockGenerateText.mockRejectedValueOnce(error)

      const isValid = await aiService.validateApiKey('openai', 'test-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with the network error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OpenAI API key validation failed:',
        error
      )
    })

    it('protects users from configuring unsupported AI services', async () => {
      await expect(
        aiService.validateApiKey('unknown-provider', 'test-key')
      ).rejects.toThrow('Provider not found: unknown-provider')
    })

    it('logs console error when Anthropic validation fails', async () => {
      const error = new Error('Invalid Anthropic API key')
      mockGenerateText.mockRejectedValueOnce(error)

      const isValid = await aiService.validateApiKey('anthropic', 'invalid-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with Anthropic-specific error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Anthropic API key validation failed:',
        error
      )
    })

    it('logs console error when Google validation fails', async () => {
      const error = new Error('Invalid Google API key')
      mockGenerateText.mockRejectedValueOnce(error)

      const isValid = await aiService.validateApiKey('google', 'invalid-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with Google-specific error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Google API key validation failed:',
        error
      )
    })

    it('logs console error when Mistral validation fails', async () => {
      const error = new Error('Invalid Mistral API key')
      mockGenerateText.mockRejectedValueOnce(error)

      const isValid = await aiService.validateApiKey('mistral', 'invalid-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with Mistral-specific error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Mistral API key validation failed:',
        error
      )
    })

    it('logs console error when Together validation fails', async () => {
      const error = new Error('Invalid Together API key')
      mockGenerateText.mockRejectedValueOnce(error)

      // Ensure SecureStorage returns the test key
      mockSecureStorage.decryptAndRetrieve.mockImplementation(async (key) => {
        if (key === 'together-api-key') return 'invalid-key'
        return null
      })

      const isValid = await aiService.validateApiKey('together', 'invalid-key')

      expect(isValid).toBe(false)
      // Assert that console.error was called with Together-specific error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Together AI API key validation failed:',
        error
      )
    })
  })

  describe('Provider Failure User Scenarios', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      },
    ]

    beforeEach(() => {
      // Mock API keys being available
      mockSecureStorage.decryptAndRetrieve.mockImplementation(async (key) => {
        if (key.includes('api-key')) return 'test-api-key'
        return null
      })
    })

    it('should provide clear error when OpenAI rate limit is exceeded', async () => {
      const error = new Error('Rate limit exceeded. Please try again later.')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the rate limit error
      expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI API error:', error)
    })

    it('should provide clear error when API quota is exhausted', async () => {
      const error = new Error('Insufficient quota. Please check your billing.')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the quota error
      expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI API error:', error)
    })

    it('should handle service outages gracefully for users', async () => {
      const error = new Error('Service temporarily unavailable')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(
          testMessages,
          'claude-3-5-sonnet-20241022'
        )
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the service outage error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Anthropic API error:',
        error
      )
    })

    it('should handle authentication errors clearly for users', async () => {
      const error = new Error('Invalid authentication credentials')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the auth error
      expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI API error:', error)
    })

    it('should handle content policy violations appropriately', async () => {
      const error = new Error('Content violates usage policies')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the policy violation error
      expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI API error:', error)
    })

    it('should handle timeout errors with user-friendly messages', async () => {
      const error = new Error('Request timeout')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with the timeout error
      expect(consoleErrorSpy).toHaveBeenCalledWith('OpenAI API error:', error)
    })

    it('should log Google API errors with proper provider prefix', async () => {
      const error = new Error('Google API rate limit exceeded')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'gemini-2.0-flash-exp')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with Google-specific error prefix
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google API error:', error)
    })

    it('should log Mistral API errors with proper provider prefix', async () => {
      const error = new Error('Mistral API authentication failed')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(testMessages, 'mistral-large-latest')
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with Mistral-specific error prefix
      expect(consoleErrorSpy).toHaveBeenCalledWith('Mistral API error:', error)
    })

    it('should log Together API errors with proper provider prefix', async () => {
      const error = new Error('Together API service unavailable')
      mockGenerateText.mockRejectedValueOnce(error)

      await expect(
        aiService.generateSingleResponse(
          testMessages,
          'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'
        )
      ).rejects.toThrow(/Failed to generate response:/)

      // Assert that console.error was called with Together-specific error prefix
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Together AI API error:',
        error
      )
    })
  })

  describe('Configuration Error User Scenarios', () => {
    it('should provide helpful guidance when no API key is configured', async () => {
      mockSecureStorage.decryptAndRetrieve.mockResolvedValue(null)

      await expect(
        aiService.generateSingleResponse([], 'gpt-4')
      ).rejects.toThrow('OpenAI API key not configured')

      await expect(
        aiService.generateSingleResponse([], 'claude-3-5-sonnet-20241022')
      ).rejects.toThrow('Anthropic API key not configured')

      await expect(
        aiService.generateSingleResponse([], 'gemini-2.0-flash-exp')
      ).rejects.toThrow('Google API key not configured')
    })

    it('should validate model existence before attempting generation', async () => {
      mockSecureStorage.decryptAndRetrieve.mockResolvedValue('test-key')

      await expect(
        aiService.generateSingleResponse([], 'nonexistent-model')
      ).rejects.toThrow('Model not found: nonexistent-model')
    })

    it('should handle empty message arrays gracefully', async () => {
      mockSecureStorage.decryptAndRetrieve.mockResolvedValue('test-key')
      mockGenerateText.mockResolvedValueOnce({
        text: 'Response with no context',
        finishReason: 'stop',
      })

      const response = await aiService.generateSingleResponse([], 'gpt-4')

      expect(response.content).toBe('Response with no context')
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
        })
      )
    })
  })

  describe('Request Cancellation User Flows', () => {
    it('should provide cancellation functionality for users', () => {
      // Test that the cancellation method exists and can be called
      expect(() => aiService.cancelPendingRequests()).not.toThrow()
    })

    it('should log cancellation for user feedback', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      aiService.cancelPendingRequests()

      expect(consoleSpy).toHaveBeenCalledWith('Cancelling pending requests...')

      consoleSpy.mockRestore()
    })
  })

  describe('Model Availability User Scenarios', () => {
    it('should provide accurate model availability information', () => {
      const models = aiService.getAvailableModels()

      // Should include all configured models
      expect(models.length).toBeGreaterThan(0)

      // Should include models from all providers
      const providers = new Set(models.map((m) => m.provider))
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('google')
      expect(providers).toContain('mistral')
      expect(providers).toContain('together')
    })

    it('should provide model capability information for user decisions', () => {
      const models = aiService.getAvailableModels()

      models.forEach((model) => {
        expect(model).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          provider: expect.any(String),
          description: expect.any(String),
          supportsLogprobs: expect.any(Boolean),
          maxTokens: expect.any(Number),
        })
      })
    })

    it('should indicate multimodal capabilities for user file uploads', () => {
      const models = aiService.getAvailableModels()
      const gpt4 = models.find((m) => m.id === 'gpt-4')

      expect(gpt4?.supportedMimeTypes).toEqual(
        expect.arrayContaining(['text/plain', 'image/jpeg', 'image/png'])
      )
    })
  })
})
