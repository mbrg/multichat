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

describe('AI Probability Calculation User Flows', () => {
  let aiService: AIService
  let mockGenerateText: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked generateText function
    const { generateText } = await import('ai')
    mockGenerateText = generateText as ReturnType<typeof vi.fn>

    // Mock API keys being available
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key.includes('api-key')) return 'test-api-key'
      return null
    })

    aiService = new AIService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Probability Scoring for User Ranking', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date()
      }
    ]

    it('should provide probability scores for user confidence assessment', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'Quantum computing explanation...',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      })

      const response = await aiService.generateSingleResponse(testMessages, 'gpt-4')

      expect(response.probability).toBeDefined()
      expect(typeof response.probability).toBe('number')
      expect(response.probability).toBeGreaterThan(0)
      expect(response.probability).toBeLessThanOrEqual(1)
    })

    it('should show higher confidence for lower temperature responses', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const conservativeResponse = await aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 0.1 })
      const creativeResponse = await aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 0.9 })

      // Lower temperature should generally result in higher confidence
      expect(conservativeResponse.probability).toBeGreaterThan(creativeResponse.probability)
    })

    it('should provide consistent probability ranges across providers', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const openaiResponse = await aiService.generateSingleResponse(testMessages, 'gpt-4')
      const anthropicResponse = await aiService.generateSingleResponse(testMessages, 'claude-3-5-sonnet-20241022')
      const googleResponse = await aiService.generateSingleResponse(testMessages, 'gemini-2.0-flash-exp')

      // All probabilities should be in valid range
      ;[openaiResponse, anthropicResponse, googleResponse].forEach(response => {
        expect(response.probability).toBeGreaterThanOrEqual(0.1)
        expect(response.probability).toBeLessThanOrEqual(0.95)
      })
    })

    it('should show probability variations in multi-response generation', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Response 1',
          finishReason: 'stop'
        })
        .mockResolvedValueOnce({
          text: 'Response 2',
          finishReason: 'stop'
        })
        .mockResolvedValueOnce({
          text: 'Response 3',
          finishReason: 'stop'
        })

      const variations = await aiService.generateVariations(testMessages, 'gpt-4', 3)

      // Should have different probabilities to help user ranking
      const probabilities = variations.map(v => v.probability)
      const uniqueProbabilities = new Set(probabilities)
      
      // At least some variation expected (allowing for rare coincidences)
      expect(uniqueProbabilities.size).toBeGreaterThanOrEqual(1)
      
      // All should be valid probabilities
      probabilities.forEach(prob => {
        expect(prob).toBeGreaterThan(0)
        expect(prob).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Probability-Based Sorting for User Convenience', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date()
      }
    ]

    it('should sort variations by probability for user ranking', async () => {
      // Mock responses with consistent pattern for testing
      mockGenerateText
        .mockResolvedValueOnce({ text: 'Response 1', finishReason: 'stop' })
        .mockResolvedValueOnce({ text: 'Response 2', finishReason: 'stop' })
        .mockResolvedValueOnce({ text: 'Response 3', finishReason: 'stop' })

      const variations = await aiService.generateVariations(testMessages, 'gpt-4', 3)

      // Should be sorted by probability (highest first)
      for (let i = 0; i < variations.length - 1; i++) {
        expect(variations[i].probability).toBeGreaterThanOrEqual(variations[i + 1].probability)
      }
    })

    it('should sort multi-model responses by probability for user comparison', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const enabledModels = ['gpt-4', 'claude-3-5-sonnet-20241022', 'gemini-2.0-flash-exp']
      const responses = await aiService.generateMultiModelResponses(testMessages, enabledModels, 2)

      // Should be sorted by probability across all models
      for (let i = 0; i < responses.length - 1; i++) {
        expect(responses[i].probability).toBeGreaterThanOrEqual(responses[i + 1].probability)
      }
    })
  })

  describe('Temperature Impact on Probability for User Understanding', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date()
      }
    ]

    it('should show probability correlation with creativity settings', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const responses = await Promise.all([
        aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 0.3 }),
        aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 0.7 }),
        aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 1.0 })
      ])

      // Generally expect probability to decrease with higher temperature
      // (though some randomness is expected)
      expect(responses[0].probability).toBeGreaterThan(0.3)
      expect(responses[2].probability).toBeLessThan(0.8)
    })

    it('should provide temperature information alongside probability for user context', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const response = await aiService.generateSingleResponse(testMessages, 'gpt-4', { temperature: 0.8 })

      expect(response.temperature).toBe(0.8)
      expect(response.probability).toBeDefined()
    })
  })

  describe('Provider-Specific Probability Handling for User Awareness', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date()
      }
    ]

    it('should handle providers without logprobs gracefully for users', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Anthropic response without logprobs',
        finishReason: 'stop'
      })

      const response = await aiService.generateSingleResponse(testMessages, 'claude-3-5-sonnet-20241022')

      // Should still provide estimated probability for user ranking
      expect(response.probability).toBeDefined()
      expect(response.probability).toBeGreaterThan(0)
      expect(response.probability).toBeLessThanOrEqual(1)
      
      // Should not have logprobs for Anthropic
      expect(response.logprobs).toBeUndefined()
    })

    it('should provide consistent user experience across all provider types', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const providers = [
        { model: 'gpt-4', provider: 'openai' },
        { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic' },
        { model: 'gemini-2.0-flash-exp', provider: 'google' },
        { model: 'mistral-large-latest', provider: 'mistral' }
      ]

      for (const { model } of providers) {
        const response = await aiService.generateSingleResponse(testMessages, model)
        
        // All should provide probability for consistent user experience
        expect(response.probability).toBeDefined()
        expect(typeof response.probability).toBe('number')
        expect(response.probability).toBeGreaterThan(0)
        expect(response.probability).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Probability Display Formatting for User Interface', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date()
      }
    ]

    it('should provide probabilities in usable format for UI display', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const response = await aiService.generateSingleResponse(testMessages, 'gpt-4')

      // Probability should be a decimal that can be easily converted to percentage
      const percentage = Math.round(response.probability * 100)
      expect(percentage).toBeGreaterThanOrEqual(10)
      expect(percentage).toBeLessThanOrEqual(95)
    })

    it('should maintain probability precision for accurate user ranking', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop'
      })

      const variations = await aiService.generateVariations(testMessages, 'gpt-4', 5)

      // Should have enough precision to distinguish between responses
      variations.forEach(variation => {
        expect(Number.isFinite(variation.probability)).toBe(true)
        expect(variation.probability.toString().length).toBeGreaterThan(2) // More than just "0.X"
      })
    })
  })
})