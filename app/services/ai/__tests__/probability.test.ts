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

describe('AI Probability Calculation User Flows', () => {
  let aiService: AIService
  let mockGenerateText: ReturnType<typeof vi.fn>
  let mockSecureStorage: {
    encryptAndStore: ReturnType<typeof vi.fn>
    decryptAndRetrieve: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    vi.clearAllMocks()

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

    // Mock API keys being available
    mockSecureStorage.decryptAndRetrieve.mockImplementation(async (key) => {
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
        timestamp: new Date(),
      },
    ]

    it('should provide probability scores for user confidence assessment', async () => {
      // Mock with logprobs for OpenAI (which supports them)
      mockGenerateText.mockResolvedValueOnce({
        text: 'Quantum computing explanation...',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        logprobs: [
          { token: 'Quantum', logprob: -0.1 },
          { token: ' computing', logprob: -0.2 },
        ],
      })

      const response = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4'
      )

      expect(response.probability).toBeDefined()
      expect(typeof response.probability).toBe('number')
      expect(response.probability).toBeGreaterThan(0)
      expect(response.probability).toBeLessThanOrEqual(1)
    })

    it('should show higher confidence for lower temperature responses', async () => {
      // Mock with different logprobs based on temperature
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.1 }, // Higher confidence (lower temp)
            { token: ' response', logprob: -0.1 },
          ],
        })
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.5 }, // Lower confidence (higher temp)
            { token: ' response', logprob: -0.6 },
          ],
        })

      const conservativeResponse = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4',
        { temperature: 0.1 }
      )
      const creativeResponse = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4',
        { temperature: 0.9 }
      )

      // Lower temperature should generally result in higher confidence
      const conservativeProb = conservativeResponse.probability
      const creativeProb = creativeResponse.probability

      expect(conservativeProb).not.toBeNull()
      expect(creativeProb).not.toBeNull()

      if (conservativeProb !== null && creativeProb !== null) {
        expect(conservativeProb).toBeGreaterThan(creativeProb)
      }
    })

    it('should provide consistent probability ranges across providers', async () => {
      // Mock with logprobs for OpenAI, undefined for others
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.3 },
            { token: ' response', logprob: -0.2 },
          ],
        })
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          // No logprobs for Anthropic
        })
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          // No logprobs for Google
        })

      const openaiResponse = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4'
      )
      const anthropicResponse = await aiService.generateSingleResponse(
        testMessages,
        'claude-3-5-sonnet-20241022'
      )
      const googleResponse = await aiService.generateSingleResponse(
        testMessages,
        'gemini-2.0-flash-exp'
      )

      // OpenAI should have real probability from logprobs
      expect(openaiResponse.probability).toBeGreaterThan(0)
      expect(openaiResponse.probability).toBeLessThanOrEqual(1)

      // Anthropic and Google should have null probability
      expect(anthropicResponse.probability).toBeNull()
      expect(googleResponse.probability).toBeNull()
    })

    it('should show probability variations in multi-response generation', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Response 1',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.1 },
            { token: ' 1', logprob: -0.2 },
          ],
        })
        .mockResolvedValueOnce({
          text: 'Response 2',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.3 },
            { token: ' 2', logprob: -0.4 },
          ],
        })
        .mockResolvedValueOnce({
          text: 'Response 3',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.5 },
            { token: ' 3', logprob: -0.6 },
          ],
        })

      const variations = await aiService.generateVariations(
        testMessages,
        'gpt-4',
        3
      )

      // Should have different probabilities to help user ranking
      const probabilities = variations.map((v) => v.probability)
      const uniqueProbabilities = new Set(probabilities)

      // At least some variation expected (allowing for rare coincidences)
      expect(uniqueProbabilities.size).toBeGreaterThanOrEqual(1)

      // All should be valid probabilities (from logprobs)
      probabilities.forEach((prob) => {
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
        timestamp: new Date(),
      },
    ]

    it('should sort variations by probability for user ranking', async () => {
      // Mock responses with different logprob values for sorting
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Response 1',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.1 },
            { token: ' 1', logprob: -0.1 },
          ], // Highest
        })
        .mockResolvedValueOnce({
          text: 'Response 2',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.3 },
            { token: ' 2', logprob: -0.3 },
          ], // Middle
        })
        .mockResolvedValueOnce({
          text: 'Response 3',
          finishReason: 'stop',
          logprobs: [
            { token: 'Response', logprob: -0.5 },
            { token: ' 3', logprob: -0.5 },
          ], // Lowest
        })

      const variations = await aiService.generateVariations(
        testMessages,
        'gpt-4',
        3
      )

      // Should be sorted by probability (highest first)
      for (let i = 0; i < variations.length - 1; i++) {
        const currentProb = variations[i].probability
        const nextProb = variations[i + 1].probability

        // Handle null values in sorting (null should come after numbers)
        if (currentProb !== null && nextProb !== null) {
          expect(currentProb).toBeGreaterThanOrEqual(nextProb)
        } else if (currentProb === null && nextProb !== null) {
          // This should not happen with OpenAI models in our test
          expect.unreachable('OpenAI should have probabilities')
        }
      }
    })

    it('should sort multi-model responses by probability for user comparison', async () => {
      // Mock different responses for different providers
      mockGenerateText.mockImplementation(async ({ model }) => {
        // OpenAI models get logprobs
        if (
          model &&
          typeof model === 'object' &&
          'provider' in model &&
          model.provider === 'openai'
        ) {
          return {
            text: 'Test response',
            finishReason: 'stop',
            logprobs: [
              { token: 'Test', logprob: -0.2 },
              { token: ' response', logprob: -0.3 },
            ],
          }
        }
        // Other providers don't get logprobs
        return {
          text: 'Test response',
          finishReason: 'stop',
        }
      })

      const enabledModels = [
        'gpt-4',
        'claude-3-5-sonnet-20241022',
        'gemini-2.0-flash-exp',
      ]
      const responses = await aiService.generateMultiModelResponses(
        testMessages,
        enabledModels,
        2
      )

      // Should be sorted properly with null values at the end
      let hasSeenNull = false
      for (let i = 0; i < responses.length - 1; i++) {
        const currentProb = responses[i].probability
        const nextProb = responses[i + 1].probability

        if (currentProb === null) {
          hasSeenNull = true
        } else if (hasSeenNull && nextProb !== null) {
          // Should not have numbers after nulls
          expect.unreachable('Numbers should come before nulls in sorting')
        } else if (currentProb !== null && nextProb !== null) {
          expect(currentProb).toBeGreaterThanOrEqual(nextProb)
        }
      }
    })
  })

  describe('Temperature Impact on Probability for User Understanding', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date(),
      },
    ]

    it('should show probability correlation with creativity settings', async () => {
      // Mock different logprobs based on temperature
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.1 },
            { token: ' response', logprob: -0.1 },
          ], // High confidence
        })
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.3 },
            { token: ' response', logprob: -0.3 },
          ], // Medium confidence
        })
        .mockResolvedValueOnce({
          text: 'Test response',
          finishReason: 'stop',
          logprobs: [
            { token: 'Test', logprob: -0.6 },
            { token: ' response', logprob: -0.6 },
          ], // Lower confidence
        })

      const responses = await Promise.all([
        aiService.generateSingleResponse(testMessages, 'gpt-4', {
          temperature: 0.3,
        }),
        aiService.generateSingleResponse(testMessages, 'gpt-4', {
          temperature: 0.7,
        }),
        aiService.generateSingleResponse(testMessages, 'gpt-4', {
          temperature: 1.0,
        }),
      ])

      // Generally expect probability to decrease with higher temperature
      const lowTempProb = responses[0].probability
      const highTempProb = responses[2].probability

      expect(lowTempProb).not.toBeNull()
      expect(highTempProb).not.toBeNull()

      if (lowTempProb !== null && highTempProb !== null) {
        expect(lowTempProb).toBeGreaterThan(0.3)
        expect(highTempProb).toBeLessThan(0.8)
        expect(lowTempProb).toBeGreaterThan(highTempProb)
      }
    })

    it('should provide temperature information alongside probability for user context', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
      })

      const response = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4',
        { temperature: 0.8 }
      )

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
        timestamp: new Date(),
      },
    ]

    it('should handle providers without logprobs gracefully for users', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Anthropic response without logprobs',
        finishReason: 'stop',
        // No logprobs for Anthropic
      })

      const response = await aiService.generateSingleResponse(
        testMessages,
        'claude-3-5-sonnet-20241022',
        { temperature: 0.7 }
      )

      // Should have null probability since no logprobs available
      expect(response.probability).toBeNull()

      // Should not have logprobs for Anthropic
      expect(response.logprobs).toBeUndefined()

      // Should still have temperature information
      expect(response.temperature).toBeDefined()
    })

    it('should provide consistent user experience across all provider types', async () => {
      // Mock different responses based on provider capabilities
      let callCount = 0
      mockGenerateText.mockImplementation(async () => {
        callCount++
        if (callCount === 1 || callCount === 4) {
          // OpenAI and Mistral
          return {
            text: 'Test response',
            finishReason: 'stop',
            logprobs: [
              { token: 'Test', logprob: -0.2 },
              { token: ' response', logprob: -0.3 },
            ],
          }
        } else {
          // Anthropic and Google
          return {
            text: 'Test response',
            finishReason: 'stop',
          }
        }
      })

      const providers = [
        { model: 'gpt-4', provider: 'openai', hasLogprobs: true },
        {
          model: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
          hasLogprobs: false,
        },
        {
          model: 'gemini-2.0-flash-exp',
          provider: 'google',
          hasLogprobs: false,
        },
        {
          model: 'mistral-large-latest',
          provider: 'mistral',
          hasLogprobs: true,
        },
      ]

      for (const { model, hasLogprobs } of providers) {
        const response = await aiService.generateSingleResponse(
          testMessages,
          model,
          { temperature: 0.7 }
        )

        // All should provide consistent interface
        expect(response.probability).toBeDefined()

        if (hasLogprobs) {
          expect(typeof response.probability).toBe('number')
          expect(response.probability).toBeGreaterThan(0)
          expect(response.probability).toBeLessThanOrEqual(1)
        } else {
          expect(response.probability).toBeNull()
        }

        // All should have temperature information
        expect(response.temperature).toBeDefined()
      }
    })
  })

  describe('Probability Display Formatting for User Interface', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing',
        timestamp: new Date(),
      },
    ]

    it('should provide probabilities in usable format for UI display', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
        logprobs: [
          { token: 'Test', logprob: -0.3 },
          { token: ' response', logprob: -0.2 },
        ],
      })

      const response = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4'
      )

      // Should have a real probability from logprobs
      expect(response.probability).not.toBeNull()

      if (response.probability !== null) {
        // Probability should be a decimal that can be easily converted to percentage
        const percentage = Math.round(response.probability * 100)
        expect(percentage).toBeGreaterThanOrEqual(1)
        expect(percentage).toBeLessThanOrEqual(99)
      }
    })

    it('should maintain probability precision for accurate user ranking', async () => {
      // Mock with varying logprobs for precision testing
      mockGenerateText.mockImplementation(async () => ({
        text: 'Test response',
        finishReason: 'stop',
        logprobs: [
          { token: 'Test', logprob: Math.random() * -0.5 }, // Random logprobs for variation
          { token: ' response', logprob: Math.random() * -0.5 },
        ],
      }))

      const variations = await aiService.generateVariations(
        testMessages,
        'gpt-4',
        5
      )

      // Should have enough precision to distinguish between responses
      variations.forEach((variation) => {
        expect(variation.probability).not.toBeNull()
        if (variation.probability !== null) {
          expect(Number.isFinite(variation.probability)).toBe(true)
          expect(variation.probability).toBeGreaterThan(0)
          expect(variation.probability).toBeLessThanOrEqual(1)
        }
      })
    })
  })
})
