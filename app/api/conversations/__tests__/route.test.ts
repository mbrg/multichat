import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { GET } from '../[id]/route'
import { getServerSession } from 'next-auth'
import { ConversationService } from '../../../services/ConversationService'

const createTestUrl = (path: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${baseUrl}${path}`
}

vi.mock('next-auth')
vi.mock('../../../services/ConversationService')

const sampleMessages = [
  {
    id: '1',
    role: 'user',
    content: 'hello',
    timestamp: new Date().toISOString(),
  },
]

describe('/api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save conversation and return id', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user1' },
    } as any)
    vi.mocked(ConversationService.save).mockResolvedValue('abc123')

    const request = new NextRequest(createTestUrl('/api/conversations'), {
      method: 'POST',
      body: JSON.stringify({ messages: sampleMessages }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe('abc123')
    expect(ConversationService.save).toHaveBeenCalledWith(
      'user1',
      expect.any(Array)
    )
  })

  it('should return 400 for invalid request', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user1' },
    } as any)

    const request = new NextRequest(createTestUrl('/api/conversations'), {
      method: 'POST',
      body: JSON.stringify({ invalid: true }),
    })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})

describe('/api/conversations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return stored conversation', async () => {
    vi.mocked(ConversationService.get).mockResolvedValue({
      id: 'abc',
      userId: 'user1',
      messages: sampleMessages as any,
      createdAt: new Date().toISOString(),
    })

    const request = new NextRequest(createTestUrl('/api/conversations/abc'))
    const response = await GET(request, { params: { id: 'abc' } })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe('abc')
  })

  it('should return 404 when not found', async () => {
    vi.mocked(ConversationService.get).mockResolvedValue(null)

    const request = new NextRequest(createTestUrl('/api/conversations/missing'))
    const response = await GET(request, { params: { id: 'missing' } })

    expect(response.status).toBe(404)
  })
})
