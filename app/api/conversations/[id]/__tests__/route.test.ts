import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, DELETE } from '../route'
import * as service from '../../../../services/ConversationService'
import { log } from '@/services/LoggingService'

const createUrl = (path: string) => 'http://localhost:3000' + path

vi.mock('../../../../services/ConversationService')

vi.mock('@/services/LoggingService', () => ({
  log: { info: vi.fn(), error: vi.fn() },
}))

describe('/api/conversations/[id] GET', () => {
  it('returns conversation when found', async () => {
    vi.mocked(service.getConversation).mockResolvedValue({ id: '1' } as any)
    const req = new NextRequest(createUrl('/api/conversations/1'))
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) })
    const data = await res.json()
    expect(data.conversation.id).toBe('1')
  })

  it('returns null when not found', async () => {
    vi.mocked(service.getConversation).mockResolvedValue(null)
    const req = new NextRequest(createUrl('/api/conversations/2'))
    const res = await GET(req, { params: Promise.resolve({ id: '2' }) })
    const data = await res.json()
    expect(data.conversation).toBeNull()
  })
})

describe('/api/conversations/[id] DELETE', () => {
  it('deletes conversation', async () => {
    vi.mocked(service.deleteConversation).mockResolvedValue()
    const req = new NextRequest(createUrl('/api/conversations/1'), {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) })
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
