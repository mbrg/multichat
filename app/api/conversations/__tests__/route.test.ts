import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getServerSession } from 'next-auth'
import * as service from '../../../services/ConversationService'

const createUrl = (path: string) => 'http://localhost:3000' + path

vi.mock('next-auth')
vi.mock('../../../services/ConversationService')

describe('/api/conversations POST', () => {
  const session = { user: { id: 'u1' } }
  beforeEach(() => {
    vi.mocked(service.saveConversation).mockResolvedValue()
    vi.mocked(service.generateUniqueId).mockResolvedValue('id123')
  })

  it('requires auth', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const req = new NextRequest(createUrl('/api/conversations'), {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('saves conversation and returns id', async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as any)
    const req = new NextRequest(createUrl('/api/conversations'), {
      method: 'POST',
      body: JSON.stringify({ messages: [], possibilities: [] }),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.id).toBe('id123')
  })
})
