import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveConversation, getConversation } from '../blob/conversations'
import type { Message } from '../../types/chat'

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
  put: vi.fn(),
  BlobNotFoundError: class extends Error {
    name = 'BlobNotFoundError'
  },
}))

const { head, put } = await import('@vercel/blob')

describe('Conversation Blob Service', () => {
  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'hi',
      timestamp: new Date('2024-01-01T00:00:00Z'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves conversation and returns id', async () => {
    vi.mocked(head).mockRejectedValue({ name: 'BlobNotFoundError' })
    vi.mocked(put).mockResolvedValue({
      pathname: 'conversations/id.json',
    } as any)
    const id = await saveConversation({
      userId: 'u1',
      messages,
      timestamp: new Date('2024-01-01T00:00:00Z'),
    })
    expect(put).toHaveBeenCalled()
    expect(typeof id).toBe('string')
  })

  it('returns null when conversation not found', async () => {
    vi.mocked(head).mockRejectedValue({ name: 'BlobNotFoundError' })
    const convo = await getConversation('missing')
    expect(convo).toBeNull()
  })

  it('retrieves conversation when exists', async () => {
    vi.mocked(head).mockResolvedValue({
      url: 'https://store/conversations/id.json',
    } as any)
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'id',
          userId: 'u1',
          messages,
          timestamp: '2024-01-01T00:00:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', mockFetch)
    const convo = await getConversation('id')
    expect(convo?.id).toBe('id')
    expect(mockFetch).toHaveBeenCalled()
  })
})
