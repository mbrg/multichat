import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import ChatContainer from '../ChatContainer'
import type { Message } from '../../types/chat'

// Mock the Settings component to avoid useApiKeys side effects
vi.mock('../Settings', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="settings-mock">Settings Mock</div> : null,
}))

describe('ChatContainer - Possibilities', () => {
  const mockOnSendMessage = vi.fn()
  const mockOnSelectPossibility = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockMessage = (overrides?: Partial<Message>): Message => ({
    id: '1',
    role: 'assistant',
    content: 'Main response',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    ...overrides,
  })

  const createMockPossibility = (id: string, content: string): Message => ({
    id,
    role: 'assistant',
    content,
    timestamp: new Date('2023-01-01T10:00:00Z'),
    isPossibility: true,
  })

  it('passes onSelectPossibility to Message components', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'Hello',
    })

    const possibilities = [
      createMockPossibility('p1', 'Hi there!'),
      createMockPossibility('p2', 'Hello!'),
    ]

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      possibilities,
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

    expect(screen.getByText('Hi there!')).toBeInTheDocument()
    expect(screen.getByText('Hello!')).toBeInTheDocument()
  })

  it('calls onSelectPossibility with correct user message when possibility is selected', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'What is 2+2?',
    })

    const selectedPossibility = createMockPossibility('p1', 'The answer is 4')
    const possibilities = [
      selectedPossibility,
      createMockPossibility('p2', '2 plus 2 equals 4'),
    ]

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      possibilities,
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

    act(() => {
      fireEvent.click(screen.getByText('The answer is 4'))
    })

    expect(mockOnSelectPossibility).toHaveBeenCalledWith(
      userMessage,
      selectedPossibility
    )
  })

  it('handles multiple conversation turns correctly', () => {
    const userMessage1 = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'First question',
    })

    const assistantMessage1 = createMockMessage({
      id: 'assistant1',
      content: 'First response',
    })

    const userMessage2 = createMockMessage({
      id: 'user2',
      role: 'user',
      content: 'Second question',
    })

    const selectedPossibility = createMockPossibility(
      'p1',
      'Second response option A'
    )
    const possibilities = [
      selectedPossibility,
      createMockPossibility('p2', 'Second response option B'),
    ]

    const assistantMessage2 = createMockMessage({
      id: 'assistant2',
      possibilities,
    })

    const messages = [
      userMessage1,
      assistantMessage1,
      userMessage2,
      assistantMessage2,
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

    act(() => {
      fireEvent.click(screen.getByText('Second response option A'))
    })

    expect(mockOnSelectPossibility).toHaveBeenCalledWith(
      userMessage2,
      selectedPossibility
    )
  })

  it('handles case when no matching user message is found', () => {
    // This should not happen in normal usage, but we test defensive behavior
    const possibilities = [createMockPossibility('p1', 'Orphaned response')]

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      possibilities,
    })

    const messages = [assistantMessage] // No user message before assistant

    act(() => {
      render(
        <ChatContainer
          messages={messages}
          onSendMessage={mockOnSendMessage}
          onSelectPossibility={mockOnSelectPossibility}
        />
      )
    })

    act(() => {
      fireEvent.click(screen.getByText('Orphaned response'))
    })

    // Should not call onSelectPossibility when no user message is found
    expect(mockOnSelectPossibility).not.toHaveBeenCalled()
  })

  it('works without onSelectPossibility callback', () => {
    const userMessage = createMockMessage({
      id: 'user1',
      role: 'user',
      content: 'Hello',
    })

    const possibilities = [createMockPossibility('p1', 'Hi there!')]

    const assistantMessage = createMockMessage({
      id: 'assistant1',
      possibilities,
    })

    const messages = [userMessage, assistantMessage]

    act(() => {
      render(
        <ChatContainer messages={messages} onSendMessage={mockOnSendMessage} />
      )
    })

    // Should render without errors
    expect(screen.getByText('Hi there!')).toBeInTheDocument()

    // Should not throw when clicked without callback
    expect(() => {
      act(() => {
        fireEvent.click(screen.getByText('Hi there!'))
      })
    }).not.toThrow()
  })

  it('handles complex conversation with multiple possibilities', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Tell me about AI',
        timestamp: new Date(),
      },
      {
        id: 'a1',
        role: 'assistant',
        content: 'AI is fascinating',
        timestamp: new Date(),
        possibilities: [
          {
            id: 'p1',
            role: 'assistant',
            content: 'AI is revolutionary',
            timestamp: new Date(),
            isPossibility: true,
          },
          {
            id: 'p2',
            role: 'assistant',
            content: 'AI is transformative',
            timestamp: new Date(),
            isPossibility: true,
          },
        ],
      },
      {
        id: 'u2',
        role: 'user',
        content: 'What about machine learning?',
        timestamp: new Date(),
      },
      {
        id: 'a2',
        role: 'assistant',
        content: 'ML is a subset of AI',
        timestamp: new Date(),
        possibilities: [
          {
            id: 'p3',
            role: 'assistant',
            content: 'ML uses algorithms to learn',
            timestamp: new Date(),
            isPossibility: true,
          },
          {
            id: 'p4',
            role: 'assistant',
            content: 'ML enables pattern recognition',
            timestamp: new Date(),
            isPossibility: true,
          },
        ],
      },
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

    // Click on first set of possibilities
    act(() => {
      fireEvent.click(screen.getByText('AI is revolutionary'))
    })
    expect(mockOnSelectPossibility).toHaveBeenCalledWith(
      messages[0], // First user message
      messages[1].possibilities![0] // First possibility
    )

    // Click on second set of possibilities
    act(() => {
      fireEvent.click(screen.getByText('ML uses algorithms to learn'))
    })
    expect(mockOnSelectPossibility).toHaveBeenCalledWith(
      messages[2], // Second user message
      messages[3].possibilities![0] // Third possibility
    )
  })
})
