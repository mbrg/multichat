import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ConversationPage from '../page'
import type { SharedConversation } from '../../../types/conversation'

// Mock fetch globally
global.fetch = vi.fn()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null })),
}))

// Mock components
vi.mock('../../../components/ChatContainer', () => ({
  default: ({ messages, isLoading }: any) => (
    <div data-testid="chat-container">
      <div data-testid="loading-state">
        {isLoading ? 'loading' : 'not-loading'}
      </div>
      <div data-testid="message-count">{messages.length}</div>
    </div>
  ),
}))

vi.mock('../../../components/LoadingSkeleton', () => ({
  default: () => <div data-testid="loading-skeleton">Loading skeleton</div>,
}))

describe('ConversationPage', () => {
  const mockConversation: SharedConversation = {
    id: 'test-id',
    createdAt: Date.now(),
    creatorId: 'user-123',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
      },
    ],
    possibilities: [
      {
        id: 'poss-1',
        provider: 'openai',
        model: 'gpt-4',
        content: 'Hello!',
        temperature: 0.7,
        probability: 0.8,
        timestamp: new Date(),
        metadata: { permutationId: 'perm-1', hasLogprobs: true },
      },
    ],
    metadata: { title: 'Test Conversation' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render component successfully', () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConversation),
    } as Response)

    render(<ConversationPage params={Promise.resolve({ id: 'test-id' })} />)

    // Initially shows loading
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should call correct API endpoint on mount', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConversation),
    } as Response)

    render(<ConversationPage params={Promise.resolve({ id: 'test-id' })} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/conversations/test-id')
    })
  })
})
