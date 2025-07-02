import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatService, type ChatServiceEvents } from '../ChatService'
import type { ChatMessage } from '../../../types/api'
import type { UserSettings } from '../../../types/settings'
import { TOKEN_LIMITS } from '../config'
import { ValidationError, NetworkError } from '../../../types/errors'

// Mock dependencies
const mockConnectionPool = {
  enqueue: vi.fn(() => Promise.resolve()),
}

const mockLogger = {
  logBusinessMetric: vi.fn(),
  logPerformance: vi.fn(),
}

const mockFetch = vi.fn()

describe('ChatService', () => {
  let chatService: ChatService
  let mockEvents: ChatServiceEvents

  beforeEach(() => {
    vi.clearAllMocks()

    chatService = new ChatService({
      connectionPool: mockConnectionPool as any,
      logger: mockLogger as any,
      fetchFn: mockFetch,
    })

    mockEvents = {
      onPossibilityStart: vi.fn(),
      onTokenReceived: vi.fn(),
      onProbabilityReceived: vi.fn(),
      onPossibilityComplete: vi.fn(),
      onError: vi.fn(),
      onStreamComplete: vi.fn(),
    }
  })

  describe('input validation', () => {
    it('should reject empty messages array', async () => {
      const messages: ChatMessage[] = []
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      await expect(
        chatService.generatePossibilities(messages, settings, mockEvents)
      ).rejects.toThrow(ValidationError)

      expect(mockEvents.onError).toHaveBeenCalledWith(
        expect.any(ValidationError)
      )
    })

    it('should reject settings with no enabled providers', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{}', // No providers enabled
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      await expect(
        chatService.generatePossibilities(messages, settings, mockEvents)
      ).rejects.toThrow(ValidationError)
    })

    it('should reject invalid enabled providers JSON', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: 'invalid-json',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      await expect(
        chatService.generatePossibilities(messages, settings, mockEvents)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('request building', () => {
    it('should enqueue task with connection pool', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      // Mock successful execution
      mockConnectionPool.enqueue.mockResolvedValueOnce(undefined)

      await chatService.generatePossibilities(messages, settings, mockEvents)

      expect(mockConnectionPool.enqueue).toHaveBeenCalledWith({
        id: expect.stringContaining('chat-'),
        priority: 'high',
        execute: expect.any(Function),
      })

      expect(mockLogger.logBusinessMetric).toHaveBeenCalledWith(
        'chat_generation_started',
        1,
        {
          messageCount: 1,
          providers: 1,
        }
      )

      expect(mockLogger.logPerformance).toHaveBeenCalledWith({
        operation: 'chat_generation',
        duration: expect.any(Number),
        success: true,
      })
    })

    it('uses possibilityTokens setting for maxTokens', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
        possibilityTokens: 250,
      }

      const request = (chatService as any).buildChatRequest(messages, settings)
      expect(request.options.maxTokens).toBe(250)
    })

    it('falls back to default tokens when not specified', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hi', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      const request = (chatService as any).buildChatRequest(messages, settings)
      expect(request.options.maxTokens).toBe(TOKEN_LIMITS.POSSIBILITY_DEFAULT)
    })
  })

  describe('possibilities management', () => {
    it('should start with empty possibilities', () => {
      expect(chatService.getPossibilities()).toEqual([])
    })

    it('should clear possibilities', () => {
      chatService.clearPossibilities()
      expect(chatService.getPossibilities()).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should handle connection pool errors', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      const poolError = new Error('Connection pool error')
      mockConnectionPool.enqueue.mockRejectedValueOnce(poolError)

      await expect(
        chatService.generatePossibilities(messages, settings, mockEvents)
      ).rejects.toThrow('Connection pool error')

      expect(mockLogger.logBusinessMetric).toHaveBeenCalledWith(
        'chat_generation_failed',
        1
      )
    })

    it('should convert unknown errors to appropriate types', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
      ]
      const settings: UserSettings = {
        enabledProviders: '{"openai": true}',
        systemInstructions: [],
        temperatures: [{ id: '1', value: 0.7 }],
      }

      // Mock an unknown error
      mockConnectionPool.enqueue.mockRejectedValueOnce('string error')

      try {
        await chatService.generatePossibilities(messages, settings, mockEvents)
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError)
        expect((error as NetworkError).message).toContain('Unknown error')
      }
    })
  })

  describe('dependency injection', () => {
    it('should use default dependencies when none provided', () => {
      const defaultService = new ChatService()
      expect(defaultService).toBeInstanceOf(ChatService)
    })

    it('should use injected dependencies', () => {
      const serviceWithDeps = new ChatService({
        connectionPool: mockConnectionPool as any,
        logger: mockLogger as any,
        fetchFn: mockFetch,
      })
      expect(serviceWithDeps).toBeInstanceOf(ChatService)
    })
  })
})
