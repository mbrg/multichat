import { describe, it, expect, vi } from 'vitest'
import SimplePossibilitiesService from '../SimplePossibilitiesService'
import type { ChatMessage } from '../../../types/api'
import type { UserSettings } from '../../../types/settings'
import { TOKEN_LIMITS } from '../config'

function createMockResponse() {
  const reader = {
    read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    releaseLock: vi.fn(),
  }
  return {
    ok: true,
    body: { getReader: () => reader },
  } as unknown as Response
}

describe('SimplePossibilitiesService', () => {
  it('sends possibilityTokens in request', async () => {
    const fetchFn = vi.fn().mockResolvedValue(createMockResponse())
    const service = new SimplePossibilitiesService({ fetchFn })

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hi', id: '1', timestamp: new Date() },
    ]
    const settings: UserSettings = {
      enabledProviders: '{"openai": true}',
      systemInstructions: [],
      temperatures: [{ id: 't', value: 0.7 }],
      enabledModels: ['gpt-4'],
      possibilityTokens: 250,
    }

    const metaService = (service as any).metadataService
    metaService.calculatePriority = () => 'high'
    const meta = metaService.generatePossibilityMetadata(settings)[0]
    await (service as any).generateSinglePossibility(meta, messages, settings, {
      onPossibilityUpdate: vi.fn(),
      onError: vi.fn(),
    })

    expect(fetchFn).toHaveBeenCalled()
    const body = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(body.options.maxTokens).toBe(250)
  })

  it('falls back to default tokens when not set', async () => {
    const fetchFn = vi.fn().mockResolvedValue(createMockResponse())
    const service = new SimplePossibilitiesService({ fetchFn })

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello', id: '1', timestamp: new Date() },
    ]
    const settings: UserSettings = {
      enabledProviders: '{"openai": true}',
      systemInstructions: [],
      temperatures: [{ id: 't', value: 0.7 }],
      enabledModels: ['gpt-4'],
    }

    const metaService2 = (service as any).metadataService
    metaService2.calculatePriority = () => 'high'
    const meta = metaService2.generatePossibilityMetadata(settings)[0]
    await (service as any).generateSinglePossibility(meta, messages, settings, {
      onPossibilityUpdate: vi.fn(),
      onError: vi.fn(),
    })

    expect(fetchFn).toHaveBeenCalled()
    const body = JSON.parse(fetchFn.mock.calls[0][1].body)
    expect(body.options.maxTokens).toBe(TOKEN_LIMITS.POSSIBILITY_DEFAULT)
  })
})
