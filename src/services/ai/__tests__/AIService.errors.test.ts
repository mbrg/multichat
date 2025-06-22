import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIService } from '../index'
import type { Message } from '../../../types/ai'

// Mock all the AI SDK modules
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({}))
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({}))
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(() => ({}))
}))

vi.mock('@ai-sdk/mistral', () => ({
  mistral: vi.fn(() => ({}))
}))

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAI: vi.fn(() => ({}))
}))

vi.mock('ai', () => ({
  generateText: vi.fn()
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('AIService Error Handling User Flows', () => {
  let aiService: AIService
  let mockGenerateText: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked generateText function
    const { generateText } = await import('ai')
    mockGenerateText = generateText

    aiService = new AIService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Key Validation User Flows', () => {
    it('should validate OpenAI API key when user enters it', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Test response',
        finishReason: 'stop'
      })

      const isValid = await aiService.validateApiKey('openai', 'valid-api-key')

      expect(isValid).toBe(true)
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5
        })
      )
    })

    it('should reject invalid OpenAI API key for user feedback', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Invalid API key'))

      const isValid = await aiService.validateApiKey('openai', 'invalid-key')

      expect(isValid).toBe(false)
    })

    it('should validate Anthropic API key when user configures it', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Claude response',
        finishReason: 'stop'
      })

      const isValid = await aiService.validateApiKey('anthropic', 'valid-anthropic-key')

      expect(isValid).toBe(true)
    })

    it('should validate Google API key when user sets it up', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Gemini response',
        finishReason: 'stop'
      })

      const isValid = await aiService.validateApiKey('google', 'valid-google-key')

      expect(isValid).toBe(true)
    })

    it('should handle network errors during API key validation gracefully', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Network timeout'))

      const isValid = await aiService.validateApiKey('openai', 'test-key')

      expect(isValid).toBe(false)
    })

    it('should reject unknown provider names for user safety', async () => {
      await expect(aiService.validateApiKey('unknown-provider', 'test-key')).rejects.toThrow(
        'Provider not found: unknown-provider'
      )
    })
  })

  describe('Provider Failure User Scenarios', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      }
    ]

    beforeEach(() => {
      // Mock API keys being available
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key.includes('api-key')) return 'test-api-key'
        return null
      })
    })

    it('should provide clear error when OpenAI rate limit is exceeded', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Rate limit exceeded. Please try again later.'))

      await expect(aiService.generateSingleResponse(testMessages, 'gpt-4')).rejects.toThrow(
        /Failed to generate response:/
      )
    })

    it('should provide clear error when API quota is exhausted', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Insufficient quota. Please check your billing.'))

      await expect(aiService.generateSingleResponse(testMessages, 'gpt-4')).rejects.toThrow(
        /Failed to generate response:/
      )
    })

    it('should handle service outages gracefully for users', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Service temporarily unavailable'))

      await expect(aiService.generateSingleResponse(testMessages, 'claude-3-5-sonnet-20241022')).rejects.toThrow(
        /Failed to generate response:/
      )
    })

    it('should handle authentication errors clearly for users', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Invalid authentication credentials'))

      await expect(aiService.generateSingleResponse(testMessages, 'gpt-4')).rejects.toThrow(
        /Failed to generate response:/
      )
    })

    it('should handle content policy violations appropriately', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Content violates usage policies'))

      await expect(aiService.generateSingleResponse(testMessages, 'gpt-4')).rejects.toThrow(
        /Failed to generate response:/
      )
    })

    it('should handle timeout errors with user-friendly messages', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(aiService.generateSingleResponse(testMessages, 'gpt-4')).rejects.toThrow(
        /Failed to generate response:/
      )
    })
  })

  describe('Configuration Error User Scenarios', () => {
    it('should provide helpful guidance when no API key is configured', async () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      await expect(aiService.generateSingleResponse([], 'gpt-4')).rejects.toThrow(
        'OpenAI API key not configured'
      )

      await expect(aiService.generateSingleResponse([], 'claude-3-5-sonnet-20241022')).rejects.toThrow(
        'Anthropic API key not configured'
      )

      await expect(aiService.generateSingleResponse([], 'gemini-2.0-flash-exp')).rejects.toThrow(
        'Google API key not configured'
      )
    })

    it('should validate model existence before attempting generation', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-key')

      await expect(aiService.generateSingleResponse([], 'nonexistent-model')).rejects.toThrow(
        'Model not found: nonexistent-model'
      )
    })

    it('should handle empty message arrays gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-key')
      mockGenerateText.mockResolvedValueOnce({
        text: 'Response with no context',
        finishReason: 'stop'
      })

      const response = await aiService.generateSingleResponse([], 'gpt-4')

      expect(response.content).toBe('Response with no context')
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: []
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
      const providers = new Set(models.map(m => m.provider))
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('google')
      expect(providers).toContain('mistral')
      expect(providers).toContain('together')
    })

    it('should provide model capability information for user decisions', () => {
      const models = aiService.getAvailableModels()
      
      models.forEach(model => {
        expect(model).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          provider: expect.any(String),
          description: expect.any(String),
          supportsLogprobs: expect.any(Boolean),
          maxTokens: expect.any(Number)
        })
      })
    })

    it('should indicate multimodal capabilities for user file uploads', () => {
      const models = aiService.getAvailableModels()
      const gpt4 = models.find(m => m.id === 'gpt-4')
      
      expect(gpt4?.supportedMimeTypes).toEqual(
        expect.arrayContaining(['text/plain', 'image/jpeg', 'image/png'])
      )
    })
  })
})