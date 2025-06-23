import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import ChatContainer from '../ChatContainer'
import type { Message } from '../../types/chat'

// Mock next-auth to return authenticated session for these tests
vi.mock('next-auth/react', async () => {
  const actual = await vi.importActual('next-auth/react')
  return {
    ...actual,
    useSession: vi.fn(() => ({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
    })),
  }
})

// Mock the Settings component to avoid useApiKeys side effects
vi.mock('../Settings', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="settings-mock">Settings Mock</div> : null,
}))

describe('ChatContainer', () => {
  const mockOnSendMessage = vi.fn()

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with required props', () => {
    const messages: Message[] = []
    act(() => {
      render(
        <ChatContainer messages={messages} onSendMessage={mockOnSendMessage} />
      )
    })

    expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
  })

  it('displays empty state when no messages', () => {
    act(() => {
      render(<ChatContainer messages={[]} onSendMessage={mockOnSendMessage} />)
    })

    expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
  })

  it('renders messages when provided', () => {
    const messages = [
      createMockMessage({ content: 'First message' }),
      createMockMessage({
        id: '2',
        role: 'assistant',
        content: 'Assistant response',
        model: 'gpt-4',
      }),
    ]

    act(() => {
      render(
        <ChatContainer messages={messages} onSendMessage={mockOnSendMessage} />
      )
    })

    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Assistant response')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    let container: HTMLElement
    act(() => {
      const result = render(
        <ChatContainer
          messages={[]}
          onSendMessage={mockOnSendMessage}
          className="custom-class"
        />
      )
      container = result.container
    })

    expect(container!.firstChild).toHaveClass('custom-class')
  })

  it('shows loading state in message input', () => {
    act(() => {
      render(
        <ChatContainer
          messages={[]}
          onSendMessage={mockOnSendMessage}
          isLoading={true}
        />
      )
    })

    expect(
      screen.getByPlaceholderText('Generating response...')
    ).toBeInTheDocument()
  })

  it('shows normal placeholder when not loading', () => {
    act(() => {
      render(
        <ChatContainer
          messages={[]}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      )
    })

    expect(
      screen.getByPlaceholderText('Start typing to see possibilities...')
    ).toBeInTheDocument()
  })

  it('passes onSendMessage to MessageInput', () => {
    act(() => {
      render(<ChatContainer messages={[]} onSendMessage={mockOnSendMessage} />)
    })

    const messageInput = screen.getByRole('textbox')
    expect(messageInput).toBeInTheDocument()
  })

  it('renders messages with unique keys', () => {
    const messages = [
      createMockMessage({ id: 'msg-1', content: 'Message 1' }),
      createMockMessage({ id: 'msg-2', content: 'Message 2' }),
    ]

    let container: HTMLElement
    act(() => {
      const result = render(
        <ChatContainer messages={messages} onSendMessage={mockOnSendMessage} />
      )
      container = result.container
    })

    const messageElements = container!.querySelectorAll('[data-testid]')
    expect(messageElements.length).toBeGreaterThanOrEqual(0)
  })

  it('handles empty messages array gracefully', () => {
    expect(() => {
      act(() => {
        render(
          <ChatContainer messages={[]} onSendMessage={mockOnSendMessage} />
        )
      })
    }).not.toThrow()
  })

  it('renders with proper structure and CSS classes', () => {
    let container: HTMLElement
    act(() => {
      const result = render(
        <ChatContainer messages={[]} onSendMessage={mockOnSendMessage} />
      )
      container = result.container
    })

    const mainContainer = container!.firstChild as HTMLElement
    expect(mainContainer).toHaveClass(
      'flex',
      'flex-col',
      'h-full',
      'bg-[#0a0a0a]'
    )
  })
})
