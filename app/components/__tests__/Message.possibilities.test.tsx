import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Message from '../Message'
import type { Message as MessageType } from '../../types/chat'

describe('Message - Possibilities', () => {
  const mockOnSelectPossibility = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockMessage = (
    overrides?: Partial<MessageType>
  ): MessageType => ({
    id: '1',
    role: 'assistant',
    content: 'Main response',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    model: 'gpt-4',
    probability: 0.85,
    ...overrides,
  })

  const createMockPossibility = (
    id: string,
    content: string,
    model?: string,
    probability?: number
  ): MessageType => ({
    id,
    role: 'assistant',
    content,
    timestamp: new Date('2023-01-01T10:00:00Z'),
    model,
    probability,
    isPossibility: true,
  })

  it('renders message without possibilities normally', () => {
    const message = createMockMessage()
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('Main response')).toBeInTheDocument()
    expect(screen.queryByText('Other possibilities:')).not.toBeInTheDocument()
  })

  it('renders possibilities panel when possibilities exist', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'Alternative response 1',
        'claude-3-opus-20240229',
        0.75
      ),
      createMockPossibility('p2', 'Alternative response 2', 'gpt-4o', 0.65),
    ]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('Main response')).toBeInTheDocument()
    expect(screen.getByText('Other possibilities:')).toBeInTheDocument()
    expect(screen.getByText('Alternative response 1')).toBeInTheDocument()
    expect(screen.getByText('Alternative response 2')).toBeInTheDocument()
  })

  it('displays possibility metadata correctly', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'Alternative response',
        'claude-3-opus-20240229',
        0.75
      ),
    ]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('c-3-opus')).toBeInTheDocument()
    expect(screen.getByText('P:75%')).toBeInTheDocument()
  })

  it('handles possibility click', () => {
    const possibility = createMockPossibility(
      'p1',
      'Alternative response',
      'claude-3-opus-20240229',
      0.75
    )
    const possibilities = [possibility]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    const possibilityElement = screen.getByText('Alternative response')
    fireEvent.click(possibilityElement)

    expect(mockOnSelectPossibility).toHaveBeenCalledWith(possibility)
  })

  it('renders multiple possibilities with correct styling', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'First alternative',
        'claude-3-opus-20240229',
        0.75
      ),
      createMockPossibility('p2', 'Second alternative', 'gpt-4o', 0.65),
      createMockPossibility('p3', 'Third alternative', 'gemini-1.5-pro', 0.55),
    ]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    possibilities.forEach((p) => {
      expect(screen.getByText(p.content)).toBeInTheDocument()
      if (p.model) {
        // Transform model name the same way the component does
        const displayModel = p.model.includes('claude')
          ? p.model
              .replace(/claude-/i, 'c-')
              .replace(/-\d{8}$/, '')
              .replace(/-latest$/, '')
          : p.model
        expect(screen.getByText(displayModel)).toBeInTheDocument()
      }
      if (p.probability) {
        expect(
          screen.getByText(`P:${Math.round(p.probability * 100)}%`)
        ).toBeInTheDocument()
      }
    })
  })

  it('applies hover styles to possibilities', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'Alternative response',
        'claude-3-opus-20240229',
        0.75
      ),
    ]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    const possibilityElement = screen
      .getByText('Alternative response')
      .closest('.cursor-pointer')
    expect(possibilityElement).toHaveClass(
      'hover:bg-[#1a1a2a]',
      'cursor-pointer'
    )
  })

  it('handles possibilities without model or probability', () => {
    const possibilities = [createMockPossibility('p1', 'Simple alternative')]

    const message = createMockMessage({ possibilities })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('Simple alternative')).toBeInTheDocument()
    expect(screen.getByText('Other possibilities:')).toBeInTheDocument()
  })

  it('does not render possibilities panel for user messages', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'Alternative response',
        'claude-3-opus-20240229',
        0.75
      ),
    ]

    const message = createMockMessage({
      role: 'user',
      content: 'User message',
      possibilities,
    })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('User message')).toBeInTheDocument()
    expect(screen.queryByText('Other possibilities:')).not.toBeInTheDocument()
    expect(screen.queryByText('Alternative response')).not.toBeInTheDocument()
  })

  it('handles empty possibilities array', () => {
    const message = createMockMessage({ possibilities: [] })
    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    expect(screen.getByText('Main response')).toBeInTheDocument()
    expect(screen.queryByText('Other possibilities:')).not.toBeInTheDocument()
  })

  it('works without onSelectPossibility callback', () => {
    const possibilities = [
      createMockPossibility(
        'p1',
        'Alternative response',
        'claude-3-opus-20240229',
        0.75
      ),
    ]

    const message = createMockMessage({ possibilities })
    render(<Message message={message} />)

    expect(screen.getByText('Alternative response')).toBeInTheDocument()

    // Should not throw when clicked without callback
    const possibilityElement = screen.getByText('Alternative response')
    expect(() => fireEvent.click(possibilityElement)).not.toThrow()
  })

  it('applies dashed border for possibility messages', () => {
    const message = createMockMessage({
      content: 'Possible answer',
      isPossibility: true,
    })

    render(
      <Message
        message={message}
        onSelectPossibility={mockOnSelectPossibility}
      />
    )

    const bubble = screen
      .getByText('Possible answer')
      .closest('div.border') as HTMLElement
    expect(bubble).toHaveClass('border-dashed')
  })
})
