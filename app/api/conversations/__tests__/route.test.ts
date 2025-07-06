import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { ConversationStorageService } from '../../../services/conversation/ConversationStorageService'

// Mock dependencies
vi.mock('next-auth')
vi.mock('../../../services/conversation/ConversationStorageService')
vi.mock('../../../lib/logging', () => ({
  getServerLogContext: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/services/LoggingService', () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('POST /api/conversations', () => {
  let mockSaveConversation: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveConversation = vi.fn()

    vi.mocked(ConversationStorageService).mockImplementation(
      () =>
        ({
          saveConversation: mockSaveConversation,
        }) as any
    )
  })

  it('should save conversation successfully when authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    })

    mockSaveConversation.mockResolvedValue({
      id: 'conv-123',
      url: 'http://localhost:3000/conversation/conv-123',
    })

    const requestBody = {
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
      ],
      possibilities: [
        {
          id: 'poss-1',
          provider: 'openai',
          model: 'gpt-4',
          content: 'Hi!',
          temperature: 0.7,
          probability: 0.8,
          timestamp: new Date(),
          metadata: { permutationId: 'perm-1', hasLogprobs: true },
        },
      ],
    }

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('conv-123')
    expect(data.url).toBe('http://localhost:3000/conversation/conv-123')
    expect(mockSaveConversation).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
          }),
        ]),
        possibilities: expect.arrayContaining([
          expect.objectContaining({
            id: 'poss-1',
            provider: 'openai',
            model: 'gpt-4',
          }),
        ]),
        metadata: {},
      }),
      expect.any(String) // baseUrl parameter
    )
  })

  it('should return 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ messages: [], possibilities: [] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
    expect(mockSaveConversation).not.toHaveBeenCalled()
  })

  it('should return 400 when request body is invalid', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    })

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Invalid request: messages and possibilities are required'
    )
    expect(mockSaveConversation).not.toHaveBeenCalled()
  })

  it('should return 400 when messages array is empty', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    })

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ messages: [], possibilities: [] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot share empty conversation')
    expect(mockSaveConversation).not.toHaveBeenCalled()
  })

  it('should handle storage service errors', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    })

    mockSaveConversation.mockRejectedValue(new Error('Storage failed'))

    const requestBody = {
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
      ],
      possibilities: [],
    }

    const request = new NextRequest('http://localhost:3000/api/conversations', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save conversation')
  })
})
