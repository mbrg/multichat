import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageInputContainer } from '../MessageInputContainer'
import type { Message as MessageType } from '../../../types/chat'

// Mock the MessageInput component
vi.mock('../../MessageInput', () => ({
  default: ({
    onSendMessage,
    disabled,
    placeholder,
    className,
  }: {
    onSendMessage: (content: string, attachments?: File[]) => void
    disabled: boolean
    placeholder: string
    className: string
  }) => {
    // Store the callback for test access
    ;(globalThis as any).__mockOnSendMessage = onSendMessage

    return (
      <input
        data-testid="message-input"
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        onChange={() => {
          /* Event handled differently in tests */
        }}
      />
    )
  },
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

describe('MessageInputContainer', () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    isLoading: false,
    disabled: false,
    isAuthenticated: true,
    messages: [],
  }

  describe('placeholder logic', () => {
    it('should show loading placeholder when isLoading is true', () => {
      render(<MessageInputContainer {...defaultProps} isLoading={true} />)

      expect(
        screen.getByPlaceholderText('Generating response...')
      ).toBeInTheDocument()
    })

    it('should show default placeholder when not disabled and not loading', () => {
      render(
        <MessageInputContainer
          {...defaultProps}
          isLoading={false}
          disabled={false}
        />
      )

      expect(screen.getByPlaceholderText('Type message...')).toBeInTheDocument()
    })

    it('should show sign in placeholder when not authenticated', () => {
      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={false}
        />
      )

      expect(
        screen.getByPlaceholderText('Sign in to start chatting...')
      ).toBeInTheDocument()
    })

    it('should show possibilities placeholder when in possibilities state', () => {
      const messagesWithPossibilities = [
        createMockMessage({
          role: 'assistant',
          content: '', // No content indicates possibilities state
          possibilities: [
            createMockMessage({ id: 'p1', content: 'Possibility 1' }),
            createMockMessage({ id: 'p2', content: 'Possibility 2' }),
          ],
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesWithPossibilities}
        />
      )

      expect(
        screen.getByPlaceholderText('Select a possibility to continue...')
      ).toBeInTheDocument()
    })

    it('should show API keys placeholder when disabled but authenticated and not in possibilities state', () => {
      const messagesWithContent = [
        createMockMessage({
          role: 'assistant',
          content: 'Complete response', // Has content, not in possibilities state
          possibilities: [],
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesWithContent}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })

    it('should show API keys placeholder when no messages and disabled', () => {
      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={[]}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })

    it('should not be in possibilities state when assistant message has content', () => {
      const messagesWithContent = [
        createMockMessage({
          role: 'assistant',
          content: 'This is a complete response',
          possibilities: [
            createMockMessage({ id: 'p1', content: 'Possibility 1' }),
          ],
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesWithContent}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })

    it('should not be in possibilities state when no possibilities array', () => {
      const messagesWithoutPossibilities = [
        createMockMessage({
          role: 'assistant',
          content: '',
          // No possibilities property
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesWithoutPossibilities}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })

    it('should not be in possibilities state when possibilities array is empty', () => {
      const messagesWithEmptyPossibilities = [
        createMockMessage({
          role: 'assistant',
          content: '',
          possibilities: [],
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesWithEmptyPossibilities}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })

    it('should not be in possibilities state when last message is user message', () => {
      const messagesEndingWithUser = [
        createMockMessage({
          id: '1',
          role: 'assistant',
          content: '',
          possibilities: [
            createMockMessage({ id: 'p1', content: 'Possibility 1' }),
          ],
        }),
        createMockMessage({
          id: '2',
          role: 'user', // Last message is user
          content: 'User follow-up',
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={messagesEndingWithUser}
        />
      )

      expect(
        screen.getByPlaceholderText('Configure API keys in settings...')
      ).toBeInTheDocument()
    })
  })

  describe('input state', () => {
    it('should disable input when isLoading is true', () => {
      render(<MessageInputContainer {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('message-input')).toBeDisabled()
    })

    it('should disable input when disabled prop is true', () => {
      render(<MessageInputContainer {...defaultProps} disabled={true} />)

      expect(screen.getByTestId('message-input')).toBeDisabled()
    })

    it('should enable input when not loading and not disabled', () => {
      render(
        <MessageInputContainer
          {...defaultProps}
          isLoading={false}
          disabled={false}
        />
      )

      expect(screen.getByTestId('message-input')).not.toBeDisabled()
    })
  })

  describe('styling and props', () => {
    it('should pass correct className to MessageInput', () => {
      render(<MessageInputContainer {...defaultProps} />)

      const input = screen.getByTestId('message-input')
      expect(input).toHaveClass(
        'bg-[#0a0a0a]',
        'border-[#2a2a2a]',
        'text-[#e0e0e0]',
        'placeholder-[#666]',
        'focus:border-[#667eea]'
      )
    })

    it('should have correct container styling', () => {
      const { container } = render(<MessageInputContainer {...defaultProps} />)

      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer).toHaveClass(
        'border-t',
        'border-[#2a2a2a]',
        'bg-[#1a1a1a]',
        'p-4'
      )

      const innerContainer = outerContainer.firstChild as HTMLElement
      expect(innerContainer).toHaveClass('max-w-[800px]', 'mx-auto')
    })

    it('should pass onSendMessage callback to MessageInput', () => {
      const mockOnSendMessage = vi.fn()

      render(
        <MessageInputContainer
          {...defaultProps}
          onSendMessage={mockOnSendMessage}
        />
      )

      // Access the stored callback from our mock and call it directly
      const storedCallback = (globalThis as any).__mockOnSendMessage
      expect(storedCallback).toBe(mockOnSendMessage)

      // Test that the callback works when called
      storedCallback('test message')
      expect(mockOnSendMessage).toHaveBeenCalledWith('test message')
    })
  })

  describe('edge cases', () => {
    it('should handle empty messages array', () => {
      render(<MessageInputContainer {...defaultProps} messages={[]} />)

      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })

    it('should prioritize loading state over other states', () => {
      const messagesWithPossibilities = [
        createMockMessage({
          role: 'assistant',
          content: '',
          possibilities: [
            createMockMessage({ id: 'p1', content: 'Possibility 1' }),
          ],
        }),
      ]

      render(
        <MessageInputContainer
          {...defaultProps}
          isLoading={true} // This should take priority
          disabled={true}
          isAuthenticated={false}
          messages={messagesWithPossibilities}
        />
      )

      expect(
        screen.getByPlaceholderText('Generating response...')
      ).toBeInTheDocument()
    })

    it('should prioritize not disabled state over authentication state', () => {
      render(
        <MessageInputContainer
          {...defaultProps}
          isLoading={false}
          disabled={false} // This should take priority
          isAuthenticated={false}
        />
      )

      expect(screen.getByPlaceholderText('Type message...')).toBeInTheDocument()
    })
  })
})
