import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveConversation, getConversation } from '../BlobConversationService'
import { BlobNotFoundError } from '@vercel/blob'
import { randomUUID } from 'crypto'

var putMock: any
var headMock: any
vi.mock('@vercel/blob', () => {
  putMock = vi.fn()
  headMock = vi.fn()
  return {
    put: putMock,
    head: headMock,
    BlobNotFoundError: class BlobNotFoundError extends Error {},
  }
})

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto')
  return { ...actual, randomUUID: vi.fn(() => 'uuid-1') }
})

describe('BlobConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves conversation and returns id', async () => {
    headMock.mockRejectedValue(new (BlobNotFoundError as any)())
    putMock.mockResolvedValue({} as any)

    const id = await saveConversation('user', [])
    expect(typeof id).toBe('string')
    expect(putMock).toHaveBeenCalled()
  })

  it('returns null when conversation missing', async () => {
    fetchMock.mockResolvedValue({ ok: false } as any)
    const conv = await getConversation('missing')
    expect(conv).toBeNull()
  })
})
