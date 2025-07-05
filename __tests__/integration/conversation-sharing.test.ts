import { describe, it, expect, vi } from 'vitest'
import { POST } from '../../app/api/conversations/route'
import { GET } from '../../app/api/conversations/[id]/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import * as service from '../../app/services/ConversationService'

vi.mock('next-auth')
vi.mock('../../app/services/ConversationService')

const createUrl = (p:string)=>'http://localhost:3000'+p

describe('conversation share flow', () => {
  it('post then get', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user:{id:'u'}} as any)
    vi.mocked(service.generateUniqueId).mockResolvedValue('share1')
    vi.mocked(service.saveConversation).mockResolvedValue()
    vi.mocked(service.getConversation).mockResolvedValue({ id:'share1' } as any)

    const postRes = await POST(new NextRequest(createUrl('/api/conversations'), { method:'POST', body: JSON.stringify({messages:[], possibilities:[]}) }))
    const postData = await postRes.json()
    const getRes = await GET(
      new NextRequest(createUrl('/api/conversations/share1')),
      { params: Promise.resolve({ id: 'share1' }) }
    )
    const getData = await getRes.json()
    expect(postData.id).toBe('share1')
    expect(getData.conversation.id).toBe('share1')
  })
})
