import { describe, it, expect, vi } from 'vitest'
import {
  generateUniqueId,
  deleteConversation,
  getConversation,
} from '../ConversationService'
import { head, del } from '@vercel/blob'
import { log } from '../LoggingService'

vi.mock('../LoggingService', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

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

describe('getConversation', () => {
  it('logs error when URL missing', async () => {
    delete process.env.BLOB_READ_WRITE_URL
    const convo = await getConversation('x')
    expect(convo).toBeNull()
    expect(log.error).toHaveBeenCalled()
  })

  it('returns conversation when found', async () => {
    process.env.BLOB_READ_WRITE_URL = 'http://store'
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{"id":"x"}'),
      })
    ) as any
    const convo = await getConversation('x')
    expect(convo?.id).toBe('x')
  })
})
