import { describe, it, expect, vi } from 'vitest'
import { generateUniqueId, deleteConversation } from '../ConversationService'
import { head, del } from '@vercel/blob'

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
  del: vi.fn(),
}))

describe('generateUniqueId', () => {
  it('retries when id exists', async () => {
    vi.mocked(head)
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce(new Error('not found'))
    const id = await generateUniqueId()
    expect(head).toHaveBeenCalled()
    expect(typeof id).toBe('string')
  })
})

describe('deleteConversation', () => {
  it('calls del with path', async () => {
    await deleteConversation('x')
    expect(del).toHaveBeenCalled()
  })
})
