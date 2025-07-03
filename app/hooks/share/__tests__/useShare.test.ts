import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useShare } from '../useShare'

// Mock navigator.clipboard
Object.assign(global, {
  navigator: { clipboard: { writeText: vi.fn() } },
})

describe('useShare encode/decode', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('encodes and decodes messages with possibilities', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        content: 'hi',
        model: 'gpt',
        timestamp: new Date(),
        possibilities: [
          {
            id: 'p1',
            role: 'assistant' as const,
            content: 'p',
            model: 'gpt',
            timestamp: new Date(),
          },
        ],
      },
    ]
    const { copyShareUrl, decodeMessages } = useShare() as any
    const encodedUrl = copyShareUrl(messages as any)
    const encoded = encodedUrl.split('share=')[1]
    const decoded = decodeMessages(encoded)
    expect(decoded[0].content).toBe('hi')
    expect(decoded[0].possibilities?.[0].content).toBe('p')
  })

  it('creates share URL and writes to clipboard', () => {
    const msgs = [
      {
        id: '1',
        role: 'user' as const,
        content: 'hi',
        model: 'gpt',
        timestamp: new Date(),
      },
    ]
    const { copyShareUrl } = useShare()
    const url = copyShareUrl(msgs as any)
    expect(url).toContain('?share=')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url)
  })
})
