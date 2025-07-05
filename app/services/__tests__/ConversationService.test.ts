import { describe, it, expect, vi } from 'vitest'
import { generateUniqueId } from '../ConversationService'
import { head } from '@vercel/blob'

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
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
