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

describe('AIService Multiple Variations User Flows', () => {
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

  describe('Generating Multiple Response Variations', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Write a creative story about a robot.',
        timestamp: new Date(),
      },
    ]

    it('should generate multiple creative variations when user wants different options', async () => {
      // Mock different responses for different temperature calls
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Conservative robot story...',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
        .mockResolvedValueOnce({
          text: 'Moderate robot story...',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
        .mockResolvedValueOnce({
          text: 'Creative robot story...',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })

      const variations = await aiService.generateVariations(
        testMessages,
        'gpt-4',
        3
      )

      expect(variations).toHaveLength(3)

      // Check that we got all three different responses
      const contents = variations.map((v) => v.content)
      expect(contents).toContain('Conservative robot story...')
      expect(contents).toContain('Moderate robot story...')
      expect(contents).toContain('Creative robot story...')

      // Should call with different temperatures
      expect(mockGenerateText).toHaveBeenCalledTimes(3)
      const temperatureCalls = mockGenerateText.mock.calls.map(
        (call) => call[0].temperature
      )
      expect(temperatureCalls).toEqual([0.7, 0.8, 0.9])
    })

    it('should sort variations by probability for user convenience', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Response 1',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
        .mockResolvedValueOnce({
          text: 'Response 2',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })

      const variations = await aiService.generateVariations(
        testMessages,
        'gpt-4',
        2
      )

      // Should be sorted by probability (highest first)
      const prob0 = variations[0].probability
      const prob1 = variations[1].probability

      if (prob0 !== null && prob1 !== null) {
        expect(prob0).toBeGreaterThanOrEqual(prob1)
      } else if (prob0 === null && prob1 !== null) {
        expect.unreachable('Null probability should not come before non-null')
      }
      // Both null or first is non-null, second is null - both are acceptable for sorting
    })

    it('should generate 5 variations when user wants maximum creativity options', async () => {
      // Mock 5 different responses
      for (let i = 0; i < 5; i++) {
        mockGenerateText.mockResolvedValueOnce({
          text: `Response ${i + 1}`,
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
      }

      const variations = await aiService.generateVariations(
        testMessages,
        'claude-3-5-sonnet-20241022',
        5
      )

      expect(variations).toHaveLength(5)
      expect(mockGenerateText).toHaveBeenCalledTimes(5)

      // Check temperature range for 5 variations
      const temperatures = mockGenerateText.mock.calls.map(
        (call) => call[0].temperature
      )
      expect(temperatures).toEqual([0.7, 0.75, 0.8, 0.9, 1.0])
    })

    it('should handle partial failures gracefully when some variations fail', async () => {
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'Successful response 1',
          finishReason: 'stop',
        })
        .mockRejectedValueOnce(new Error('API timeout'))
        .mockResolvedValueOnce({
          text: 'Successful response 2',
          finishReason: 'stop',
        })

      await expect(
        aiService.generateVariations(testMessages, 'gpt-4', 3)
      ).rejects.toThrow()
    })
  })

  describe('Multi-Model Response Generation', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Explain quantum computing in simple terms.',
        timestamp: new Date(),
      },
    ]

    it('should generate responses from multiple models when user wants diverse perspectives', async () => {
      // Mock responses for different models
      mockGenerateText.mockImplementation((options) => {
        const modelName = options.model.constructor.name || 'unknown'
        return Promise.resolve({
          text: `Quantum explanation from ${modelName}`,
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
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

      // Should get 2 variations × 3 models = 6 total responses
      expect(responses).toHaveLength(6)

      // Should include responses from all requested models
      const modelIds = responses.map((r) => r.model.id)
      expect(modelIds).toContain('gpt-4')
      expect(modelIds).toContain('claude-3-5-sonnet-20241022')
      expect(modelIds).toContain('gemini-2.0-flash-exp')
    })

    it('should sort all multi-model responses by probability for user ranking', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      })

      const enabledModels = ['gpt-4', 'claude-3-5-sonnet-20241022']
      const responses = await aiService.generateMultiModelResponses(
        testMessages,
        enabledModels,
        2
      )

      // Check that responses are sorted by probability
      for (let i = 0; i < responses.length - 1; i++) {
        const currentProb = responses[i].probability
        const nextProb = responses[i + 1].probability

        // Handle null probability sorting (nulls should come after numbers)
        if (currentProb !== null && nextProb !== null) {
          expect(currentProb).toBeGreaterThanOrEqual(nextProb)
        } else if (currentProb === null && nextProb !== null) {
          expect.unreachable('Null probability should not come before non-null')
        }
        // Both null or first is non-null, second is null - both are acceptable for sorting
      }
    })

    it('should continue with available models when some models fail', async () => {
      // Set up one successful response for GPT-4
      mockGenerateText
        .mockResolvedValueOnce({
          text: 'GPT-4 response 1',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
        .mockResolvedValueOnce({
          text: 'GPT-4 response 2',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        })
        // Anthropic calls will fail
        .mockRejectedValueOnce(new Error('Anthropic API unavailable'))
        .mockRejectedValueOnce(new Error('Anthropic API unavailable'))

      const enabledModels = ['gpt-4', 'claude-3-5-sonnet-20241022']
      const responses = await aiService.generateMultiModelResponses(
        testMessages,
        enabledModels,
        2
      )

      // Should still get responses from the working model
      expect(responses.length).toBe(2) // 2 responses from GPT-4
      expect(responses.every((r) => r.model.id === 'gpt-4')).toBe(true)
    })

    it('should respect custom options across all models', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
      })

      const customOptions = { maxTokens: 150 }
      const enabledModels = ['gpt-4']

      await aiService.generateMultiModelResponses(
        testMessages,
        enabledModels,
        1,
        customOptions
      )

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 150,
          messages: expect.any(Array),
          model: expect.any(Object),
          temperature: 0.7, // Default temperature from getDefaultTemperatureRange(1)
        })
      )
    })
  })

  describe('User Experience Features', () => {
    it('should provide unique IDs for each response for user tracking', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
      })

      const variations = await aiService.generateVariations([], 'gpt-4', 3)

      const ids = variations.map((v) => v.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3) // All IDs should be unique
    })

    it('should include model information for user understanding', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
      })

      const response = await aiService.generateSingleResponse([], 'gpt-4')

      expect(response.model).toMatchObject({
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        description: expect.any(String),
      })
    })

    it('should include usage statistics for user cost tracking', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Test response',
        finishReason: 'stop',
        usage: {
          promptTokens: 25,
          completionTokens: 15,
          totalTokens: 40,
        },
      })

      const response = await aiService.generateSingleResponse([], 'gpt-4')

      expect(response.usage).toEqual({
        promptTokens: 25,
        completionTokens: 15,
        totalTokens: 40,
      })
    })
  })
})
