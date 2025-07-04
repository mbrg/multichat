import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { GET } from '../[id]/route'
import { getServerSession } from 'next-auth'
import * as blobService from '../../../services/blob/conversations'

const createUrl = (path: string) => {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}${path}`
}

vi.mock('next-auth')
vi.mock('../../../services/blob/conversations')

describe('/api/conversations', () => {
  const mockSession = { user: { id: 'user1' } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const req = new NextRequest(createUrl('/api/conversations'), {
        method: 'POST',
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('saves conversation and returns id', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(blobService.saveConversation).mockResolvedValue('abc')
      const req = new NextRequest(createUrl('/api/conversations'), {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            {
              id: '1',
              role: 'user',
              content: 'hi',
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('abc')
    })
  })

  describe('GET', () => {
    it('returns 404 when not found', async () => {
      vi.mocked(blobService.getConversation).mockResolvedValue(null)
      const req = new NextRequest(createUrl('/api/conversations/none'))
      const res = await GET(req, { params: { id: 'none' } })
      expect(res.status).toBe(404)
    })

    it('returns conversation when exists', async () => {
      vi.mocked(blobService.getConversation).mockResolvedValue({
        id: 'x',
        userId: 'u',
        messages: [],
        timestamp: new Date(),
      })
      const req = new NextRequest(createUrl('/api/conversations/x'))
      const res = await GET(req, { params: { id: 'x' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('x')
    })
  })
})
