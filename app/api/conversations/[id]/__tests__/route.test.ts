import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import { ConversationStorageService } from '../../../../services/conversation/ConversationStorageService'
import type { SharedConversation } from '../../../../types/conversation'

// Mock dependencies
vi.mock('../../../../services/conversation/ConversationStorageService')
vi.mock('../../../../lib/logging', () => ({
  getServerLogContext: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/services/LoggingService', () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('GET /api/conversations/[id]', () => {
  let mockGetConversation: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConversation = vi.fn()

    vi.mocked(ConversationStorageService).mockImplementation(
      () =>
        ({
          getConversation: mockGetConversation,
        }) as any
    )
  })

  it('should retrieve conversation successfully', async () => {
    const mockConversation: SharedConversation = {
      id: 'conv-123',
      version: '1.0.0',
      createdAt: Date.now(),
      creatorId: 'user-123',
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
      ],
      possibilities: [
        {
          id: 'poss-1',
          provider: 'openai',
          model: 'gpt-4',
          content: 'Hi there!',
          temperature: 0.7,
          probability: 0.8,
          timestamp: new Date(),
          metadata: { permutationId: 'perm-1', hasLogprobs: true },
        },
      ],
      metadata: { title: 'Test Conversation' },
    }

    mockGetConversation.mockResolvedValue(mockConversation)

    const request = new NextRequest(
      'http://localhost:3000/api/conversations/conv-123'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: 'conv-123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe(mockConversation.id)
    expect(data.createdAt).toBe(mockConversation.createdAt)
    expect(data.creatorId).toBe(mockConversation.creatorId)
    expect(data.messages).toHaveLength(1)
    expect(data.possibilities).toHaveLength(1)
    expect(data.metadata).toEqual(mockConversation.metadata)
    expect(mockGetConversation).toHaveBeenCalledWith('conv-123')
  })

  it('should return 404 when conversation not found', async () => {
    mockGetConversation.mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/conversations/nonexistent'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Conversation not found')
    expect(mockGetConversation).toHaveBeenCalledWith('nonexistent')
  })

  it('should handle storage service errors', async () => {
    mockGetConversation.mockRejectedValue(new Error('Storage error'))

    const request = new NextRequest(
      'http://localhost:3000/api/conversations/conv-123'
    )
    const response = await GET(request, {
      params: Promise.resolve({ id: 'conv-123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to retrieve conversation')
  })

  it('should validate conversation ID format', async () => {
    const request = new NextRequest('http://localhost:3000/api/conversations/')
    const response = await GET(request, { params: Promise.resolve({ id: '' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid conversation ID')
    expect(mockGetConversation).not.toHaveBeenCalled()
  })
})
