import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessagesList } from '../MessagesList'
import type { Message as MessageType } from '../../../types/chat'

// Mock the MessageWithIndependentPossibilities component
vi.mock('../../MessageWithIndependentPossibilities', () => ({
  default: ({
    message,
    onSelectPossibility,
    onContinuePossibility,
    className,
    showPossibilities,
    conversationMessages,
  }: {
    message: MessageType
    onSelectPossibility: (
      userMessage: MessageType,
      possibility: MessageType
    ) => void
    onContinuePossibility: (possibility: MessageType) => void
    className: string
    showPossibilities: boolean
    conversationMessages: MessageType[]
  }) => (
    <div
      data-testid={`message-${message.id}`}
      data-role={message.role}
      data-content={message.content}
      data-show-possibilities={showPossibilities}
      className={className}
      onClick={() => {
        // Test helper to trigger callbacks
        if (message.role === 'assistant' && message.possibilities?.[0]) {
          onSelectPossibility(conversationMessages[0], message.possibilities[0])
        }
        if (message.role === 'assistant') {
          onContinuePossibility(message)
        }
      }}
    >
      {message.content || `[${message.role} message]`}
    </div>
  ),
}))

const createMockMessage = (
  overrides: Partial<MessageType> = {}
): MessageType => ({
  id: '1',
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
  ...overrides,
})

describe('MessagesList', () => {
  // Mock scrollIntoView
  const mockScrollIntoView = vi.fn()

  beforeEach(() => {
    // Mock scrollIntoView for all elements
    window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when messages array is empty', () => {
    it('should render empty state message', () => {
      render(<MessagesList messages={[]} />)

      expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
    })

    it('should have correct styling for empty state', () => {
      render(<MessagesList messages={[]} />)

      const emptyStateContainer = screen.getByText(
        'Start a conversation...'
      ).parentElement
      expect(emptyStateContainer).toHaveClass(
        'flex',
        'items-center',
        'justify-center',
        'h-full',
        'text-[#888]'
      )
    })
  })

  describe('when messages are present', () => {
    it('should render all messages', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user', content: 'Hello' }),
        createMockMessage({ id: '2', role: 'assistant', content: 'Hi there' }),
      ]

      render(<MessagesList messages={messages} />)

      expect(screen.getByTestId('message-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-2')).toBeInTheDocument()
    })

    it('should pass correct props to MessageWithIndependentPossibilities', () => {
      const messages = [
        createMockMessage({
          id: '1',
          role: 'assistant',
          content: 'Response',
        }),
      ]

      render(<MessagesList messages={messages} />)

      const messageElement = screen.getByTestId('message-1')
      expect(messageElement).toHaveAttribute('data-role', 'assistant')
      expect(messageElement).toHaveAttribute('data-content', 'Response')
      expect(messageElement).toHaveAttribute('data-show-possibilities', 'false')
      expect(messageElement).toHaveClass(
        'max-w-[800px]',
        'w-full',
        'self-center',
        'animate-fadeIn'
      )
    })

    it('should show possibilities when assistant message has no content', () => {
      const messages = [
        createMockMessage({
          id: '1',
          role: 'assistant',
          content: '', // Empty content should show possibilities
        }),
      ]

      render(<MessagesList messages={messages} />)

      const messageElement = screen.getByTestId('message-1')
      expect(messageElement).toHaveAttribute('data-show-possibilities', 'true')
    })

    it('should not show possibilities when assistant message has content', () => {
      const messages = [
        createMockMessage({
          id: '1',
          role: 'assistant',
          content: 'Complete response',
        }),
      ]

      render(<MessagesList messages={messages} />)

      const messageElement = screen.getByTestId('message-1')
      expect(messageElement).toHaveAttribute('data-show-possibilities', 'false')
    })

    it('should not show possibilities for user messages', () => {
      const messages = [
        createMockMessage({
          id: '1',
          role: 'user',
          content: '',
        }),
      ]

      render(<MessagesList messages={messages} />)

      const messageElement = screen.getByTestId('message-1')
      expect(messageElement).toHaveAttribute('data-show-possibilities', 'false')
    })
  })

  describe('auto-scroll behavior', () => {
    it('should scroll to bottom when messages change', () => {
      const { rerender } = render(<MessagesList messages={[]} />)

      // Add a message
      const newMessages = [
        createMockMessage({ id: '1', content: 'New message' }),
      ]
      rerender(<MessagesList messages={newMessages} />)

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    })

    it('should scroll to bottom on initial render with messages', () => {
      const messages = [
        createMockMessage({ id: '1', content: 'Initial message' }),
      ]
      render(<MessagesList messages={messages} />)

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    })
  })

  describe('callback handling', () => {
    it('should handle onSelectPossibility callback', () => {
      const mockOnSelectPossibility = vi.fn()
      const userMessage = createMockMessage({
        id: '1',
        role: 'user',
        content: 'Question',
      })
      const possibility = createMockMessage({
        id: 'p1',
        role: 'assistant',
        content: 'Answer',
      })
      const assistantMessage = createMockMessage({
        id: '2',
        role: 'assistant',
        content: '',
        possibilities: [possibility],
      })
      const messages = [userMessage, assistantMessage]

      render(
        <MessagesList
          messages={messages}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )

      // Click the assistant message to trigger the callback
      const assistantElement = screen.getByTestId('message-2')
      assistantElement.click()

      expect(mockOnSelectPossibility).toHaveBeenCalledWith(
        userMessage,
        possibility
      )
    })

    it('should handle onContinuePossibility callback', () => {
      const mockOnContinuePossibility = vi.fn()
      const assistantMessage = createMockMessage({
        id: '1',
        role: 'assistant',
        content: 'Response',
      })
      const messages = [assistantMessage]

      render(
        <MessagesList
          messages={messages}
          onContinuePossibility={mockOnContinuePossibility}
        />
      )

      // Click the assistant message to trigger the callback
      const assistantElement = screen.getByTestId('message-1')
      assistantElement.click()

      expect(mockOnContinuePossibility).toHaveBeenCalledWith(assistantMessage)
    })

    it('should work without callbacks provided', () => {
      const messages = [createMockMessage({ id: '1', content: 'Test' })]

      expect(() => {
        render(<MessagesList messages={messages} />)
      }).not.toThrow()
    })
  })

  describe('container styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<MessagesList messages={[]} />)

      const messagesContainer = container.firstChild as HTMLElement
      expect(messagesContainer).toHaveClass(
        'flex-1',
        'overflow-y-auto',
        'overflow-x-hidden',
        'p-5',
        'flex',
        'flex-col',
        'gap-4',
        '-webkit-overflow-scrolling-touch'
      )
    })
  })
})
