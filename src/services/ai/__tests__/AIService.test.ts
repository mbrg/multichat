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

describe('AIService User Flows', () => {
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

    // Mock the generateText function with default success response
    mockGenerateText.mockResolvedValue({
      text: 'Test response from AI',
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    })

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

  describe('Generating Single AI Responses', () => {
    const testMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date(),
      },
    ]

    it('should generate a response from OpenAI when user requests GPT-4', async () => {
      const response = await aiService.generateSingleResponse(
        testMessages,
        'gpt-4'
      )

      expect(response).toMatchObject({
        id: expect.any(String),
        model: expect.objectContaining({
          id: 'gpt-4',
          provider: 'openai',
        }),
        content: 'Test response from AI',
        probability: expect.any(Number),
        isStreaming: false,
      })
      expect(response.probability).toBeGreaterThan(0)
      expect(response.probability).toBeLessThanOrEqual(1)
    })

    it('should generate a response from Anthropic when user requests Claude', async () => {
      const response = await aiService.generateSingleResponse(
        testMessages,
        'claude-3-5-sonnet-20241022'
      )

      expect(response).toMatchObject({
        id: expect.any(String),
        model: expect.objectContaining({
          id: 'claude-3-5-sonnet-20241022',
          provider: 'anthropic',
        }),
        content: 'Test response from AI',
        probability: expect.any(Number),
        isStreaming: false,
      })
    })

    it('should generate a response from Google when user requests Gemini', async () => {
      const response = await aiService.generateSingleResponse(
        testMessages,
        'gemini-2.0-flash-exp'
      )

      expect(response).toMatchObject({
        model: expect.objectContaining({
          id: 'gemini-2.0-flash-exp',
          provider: 'google',
        }),
        content: 'Test response from AI',
      })
    })

    it('should include conversation context when generating responses', async () => {
      const conversationMessages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'What is the capital of France?',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'The capital of France is Paris.',
          timestamp: new Date(),
        },
        {
          id: '3',
          role: 'user',
          content: 'What about Italy?',
          timestamp: new Date(),
        },
      ]

      await aiService.generateSingleResponse(conversationMessages, 'gpt-4')

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'What is the capital of France?' },
            { role: 'assistant', content: 'The capital of France is Paris.' },
            { role: 'user', content: 'What about Italy?' },
          ],
        })
      )
    })

    it('should apply custom temperature when user specifies creativity level', async () => {
      await aiService.generateSingleResponse(testMessages, 'gpt-4', {
        temperature: 0.9,
      })

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        })
      )
    })

    it('should respect token limits when user has long conversations', async () => {
      await aiService.generateSingleResponse(testMessages, 'gpt-4', {
        maxTokens: 100,
      })

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 100,
        })
      )
    })
  })

  describe('Error Handling for User Scenarios', () => {
    it('should provide helpful error when user has not configured API key', async () => {
      mockSecureStorage.decryptAndRetrieve.mockResolvedValue(null)

      await expect(
        aiService.generateSingleResponse([], 'gpt-4')
      ).rejects.toThrow('OpenAI API key not configured')
    })

    it('should provide helpful error when user requests unknown model', async () => {
      await expect(
        aiService.generateSingleResponse([], 'unknown-model')
      ).rejects.toThrow('Model not found: unknown-model')
    })

    it('should handle API failures gracefully for users', async () => {
      mockGenerateText.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      )

      await expect(
        aiService.generateSingleResponse([], 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)
    })

    it('should handle network failures gracefully for users', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        aiService.generateSingleResponse([], 'gpt-4')
      ).rejects.toThrow(/Failed to generate response:/)
    })
  })

  describe('Model Information for Users', () => {
    it('should provide list of available models for user selection', () => {
      const models = aiService.getAvailableModels()

      expect(models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'gpt-4',
            name: 'GPT-4',
            provider: 'openai',
          }),
          expect.objectContaining({
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            provider: 'anthropic',
          }),
          expect.objectContaining({
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash',
            provider: 'google',
          }),
        ])
      )
    })

    it('should provide model capabilities information for user decisions', () => {
      const models = aiService.getAvailableModels()
      const gpt4 = models.find((m) => m.id === 'gpt-4')

      expect(gpt4).toMatchObject({
        supportsLogprobs: true,
        maxTokens: expect.any(Number),
        supportedMimeTypes: expect.arrayContaining([
          'text/plain',
          'image/jpeg',
        ]),
      })
    })
  })
})
