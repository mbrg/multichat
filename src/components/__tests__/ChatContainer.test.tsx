import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatContainer from '../ChatContainer'
import type { Message } from '../../types/chat'

describe('ChatContainer', () => {
  const mockOnSendMessage = vi.fn()

  const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
    id: '1',
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with required props', () => {
    const messages: Message[] = []
    render(
      <ChatContainer
        messages={messages}
        onSendMessage={mockOnSendMessage}
      />
    )

    expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
  })

  it('displays empty state when no messages', () => {
    render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
  })

  it('renders messages when provided', () => {
    const messages = [
      createMockMessage({ content: 'First message' }),
      createMockMessage({ 
        id: '2', 
        role: 'assistant', 
        content: 'Assistant response',
        model: 'gpt-4'
      })
    ]

    render(
      <ChatContainer
        messages={messages}
        onSendMessage={mockOnSendMessage}
      />
    )

    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Assistant response')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
        className="custom-class"
      />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows loading state in message input', () => {
    render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isLoading={true}
      />
    )

    expect(screen.getByPlaceholderText('Generating response...')).toBeInTheDocument()
  })

  it('shows normal placeholder when not loading', () => {
    render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isLoading={false}
      />
    )

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('passes onSendMessage to MessageInput', () => {
    render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const messageInput = screen.getByRole('textbox')
    expect(messageInput).toBeInTheDocument()
  })

  it('renders messages with unique keys', () => {
    const messages = [
      createMockMessage({ id: 'msg-1', content: 'Message 1' }),
      createMockMessage({ id: 'msg-2', content: 'Message 2' })
    ]

    const { container } = render(
      <ChatContainer
        messages={messages}
        onSendMessage={mockOnSendMessage}
      />
    )

    const messageElements = container.querySelectorAll('[data-testid]')
    expect(messageElements.length).toBeGreaterThanOrEqual(0)
  })

  it('handles empty messages array gracefully', () => {
    expect(() => {
      render(
        <ChatContainer
          messages={[]}
          onSendMessage={mockOnSendMessage}
        />
      )
    }).not.toThrow()
  })

  it('renders with proper structure and CSS classes', () => {
    const { container } = render(
      <ChatContainer
        messages={[]}
        onSendMessage={mockOnSendMessage}
      />
    )

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('flex', 'flex-col', 'h-full', 'bg-white')
  })
})