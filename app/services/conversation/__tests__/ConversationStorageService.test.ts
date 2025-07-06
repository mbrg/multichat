import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConversationStorageService } from '../ConversationStorageService'
import type {
  SharedConversation,
  ShareConversationRequest,
} from '../../../types/conversation'
import type { Message } from '../../../types/chat'
import type { PossibilityResponse } from '../../../types/api'

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  head: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
}))

describe('ConversationStorageService', () => {
  let service: ConversationStorageService
  let mockPut: any
  let mockHead: any
  let mockList: any

  beforeEach(async () => {
    vi.clearAllMocks()
    service = new ConversationStorageService()

    const blobModule = vi.mocked(await import('@vercel/blob'))
    mockPut = blobModule.put
    mockHead = blobModule.head
    mockList = blobModule.list
  })

  describe('saveConversation', () => {
    const mockRequest: ShareConversationRequest = {
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2023-01-01'),
        },
      ] as Message[],
      possibilities: [
        {
          id: 'poss-1',
          provider: 'openai',
          model: 'gpt-4',
          content: 'Hi there!',
          temperature: 0.7,
          probability: 0.8,
          timestamp: new Date('2023-01-01'),
          metadata: {
            permutationId: 'perm-1',
            hasLogprobs: true,
          },
        },
      ] as PossibilityResponse[],
      metadata: {
        title: 'Test Conversation',
      },
    }

    it('should generate unique conversation ID and save successfully', async () => {
      mockHead.mockRejectedValue(new Error('Not found'))
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/conversations/test-id.json',
      })

      const result = await service.saveConversation('user-123', mockRequest)

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(result.url).toBe(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/conversation/${result.id}`
      )
      expect(mockPut).toHaveBeenCalledWith(
        `conversations/${result.id}.json`,
        expect.any(String),
        { access: 'public' }
      )
    })

    it('should retry ID generation on collision', async () => {
      mockHead
        .mockResolvedValueOnce({ url: 'exists' }) // First ID exists
        .mockRejectedValueOnce(new Error('Not found')) // Second ID doesn't exist
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/conversations/test-id.json',
      })

      const result = await service.saveConversation('user-123', mockRequest)

      expect(mockHead).toHaveBeenCalledTimes(2)
      expect(result.id).toBeTruthy()
    })

    it('should include creator ID and timestamp in stored data', async () => {
      mockHead.mockRejectedValue(new Error('Not found'))
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel-storage.com/conversations/test-id.json',
      })

      await service.saveConversation('user-123', mockRequest)

      const storedData = JSON.parse(mockPut.mock.calls[0][1])
      expect(storedData.creatorId).toBe('user-123')
      expect(storedData.createdAt).toBeTypeOf('number')

      // Check messages structure (dates become strings in JSON)
      expect(storedData.messages).toHaveLength(1)
      expect(storedData.messages[0].id).toBe('msg-1')
      expect(storedData.messages[0].role).toBe('user')
      expect(storedData.messages[0].content).toBe('Hello')

      // Check possibilities structure
      expect(storedData.possibilities).toHaveLength(1)
      expect(storedData.possibilities[0].id).toBe('poss-1')
      expect(storedData.possibilities[0].provider).toBe('openai')

      expect(storedData.metadata).toEqual(mockRequest.metadata)
    })

    it('should throw error when save fails', async () => {
      mockHead.mockRejectedValue(new Error('Not found'))
      mockPut.mockRejectedValue(new Error('Storage error'))

      await expect(
        service.saveConversation('user-123', mockRequest)
      ).rejects.toThrow('Failed to save conversation: Storage error')
    })
  })

  describe('getConversation', () => {
    it('should retrieve conversation successfully', async () => {
      // Mock legacy conversation data (without version field)
      const mockLegacyConversation = {
        id: 'test-id',
        createdAt: Date.now(),
        creatorId: 'user-123',
        messages: [],
        possibilities: [],
        metadata: {},
      }

      // Expected result after migration
      const expectedConversation: SharedConversation = {
        ...mockLegacyConversation,
        version: '1.0.0', // Added by migration
      }

      mockList.mockResolvedValue({
        blobs: [
          {
            url: 'https://example.blob.vercel-storage.com/conversations/test-id.json',
          },
        ],
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLegacyConversation),
      })

      const result = await service.getConversation('test-id')

      expect(result).toEqual(expectedConversation)
      expect(mockList).toHaveBeenCalledWith({
        prefix: 'conversations/test-id',
      })
      expect(fetch).toHaveBeenCalledWith(
        'https://example.blob.vercel-storage.com/conversations/test-id.json'
      )
    })

    it('should return null when conversation not found', async () => {
      mockList.mockResolvedValue({
        blobs: [],
      })

      const result = await service.getConversation('nonexistent-id')

      expect(result).toBeNull()
      expect(mockList).toHaveBeenCalledWith({
        prefix: 'conversations/nonexistent-id',
      })
    })

    it('should throw error on network failure', async () => {
      mockList.mockRejectedValue(new Error('Network error'))

      await expect(service.getConversation('test-id')).rejects.toThrow(
        'Failed to retrieve conversation: Network error'
      )
    })
  })
})
