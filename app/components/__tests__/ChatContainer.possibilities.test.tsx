import { render, screen, act } from '@testing-library/react'
import { vi } from 'vitest'
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

// Mock VirtualizedPossibilitiesPanel
vi.mock('../VirtualizedPossibilitiesPanel', () => ({
  default: () => (
    <div data-testid="virtualized-possibilities">
      Possibilities Panel (New System)
    </div>
  ),
}))

// Mock useSettings hook to provide mock settings
vi.mock('../../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      enabledProviders: '["openai"]',
      temperatures: [{ value: 0.7 }],
      systemInstructions: [],
    },
  }),
}))

describe('ChatContainer - Possibilities (New System)', () => {
  const mockOnSendMessage = vi.fn()
  const mockOnSelectPossibility = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockMessage = (overrides?: Partial<Message>): Message => ({
    id: '1',
    role: 'assistant',
    content: '', // Default to empty content for new system
    timestamp: new Date('2023-01-01T10:00:00Z'),
    ...overrides,
  })

  it('renders assistant message with new possibilities system', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'Hello',
    })

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      content: '', // Empty content triggers new system
    })

    const messages = [userMessage, assistantMessage]

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    // Verify the new system is rendered
    expect(screen.getByTestId('virtualized-possibilities')).toBeInTheDocument()
    expect(
      screen.getByText('Possibilities Panel (New System)')
    ).toBeInTheDocument()
  })

  it('does not show possibilities panel for assistant messages with content', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'Hello',
    })

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      content: 'This is a response', // Has content, should not show possibilities
    })

    const messages = [userMessage, assistantMessage]

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    // Should not show possibilities panel
    expect(
      screen.queryByTestId('virtualized-possibilities')
    ).not.toBeInTheDocument()
  })

  it('does not show possibilities panel for user messages', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'Hello',
    })

    const messages = [userMessage]

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    // Should not show possibilities panel
    expect(
      screen.queryByTestId('virtualized-possibilities')
    ).not.toBeInTheDocument()
  })

  it('renders multiple messages correctly', () => {
    const messages = [
      createMockMessage({
        id: 'user1',
        role: 'user',
        content: 'First question',
      }),
      createMockMessage({
        id: 'assistant1',
        content: '', // Will show possibilities
      }),
      createMockMessage({
        id: 'user2',
        role: 'user',
        content: 'Second question',
      }),
      createMockMessage({
        id: 'assistant2',
        content: 'A regular response', // Will not show possibilities
      }),
    ]

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    // Should show content for all messages
    expect(screen.getByText('First question')).toBeInTheDocument()
    expect(screen.getByText('Second question')).toBeInTheDocument()
    expect(screen.getByText('A regular response')).toBeInTheDocument()

    // Should show one possibilities panel (for assistant1 with empty content)
    expect(screen.getByTestId('virtualized-possibilities')).toBeInTheDocument()
  })

  it('renders with empty message list', () => {
    act(() => {
      render(
        <ChatContainer
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    // Should show start conversation message
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument()
  })

  it('passes props correctly to container', () => {
    const messages = [
      createMockMessage({
        id: 'user1',
        role: 'user',
        content: 'Test message',
      }),
    ]

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
          isLoading={true}
          disabled={true}
          className="test-class"
        />
      )
    })

    // Should render without errors when all props are passed
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })
})
