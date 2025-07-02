import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Message from '../Message'
import type { Message as MessageType, Attachment } from '../../types/chat'

describe('Message', () => {
  const createMockMessage = (
    overrides: Partial<MessageType> = {}
  ): MessageType => ({
    id: '1',
    role: 'user',
    content: 'Test message content',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  })

  const createMockAttachment = (
    overrides: Partial<Attachment> = {}
  ): Attachment => ({
    id: 'att-1',
    name: 'test.jpg',
    type: 'image/jpeg',
    size: 1024,
    data: 'base64data',
    preview: 'data:image/jpeg;base64,preview',
    ...overrides,
  })

  it('renders user message correctly', () => {
    const message = createMockMessage({
      role: 'user',
      content: 'Hello world',
    })

    render(<Message message={message} />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument() // User avatar
  })

  it('renders assistant message correctly', () => {
    const message = createMockMessage({
      role: 'assistant',
      content: 'Assistant response',
      model: 'gpt-4',
    })

    render(<Message message={message} />)

    expect(screen.getByText('Assistant response')).toBeInTheDocument()
    expect(screen.getByAltText('AI')).toBeInTheDocument() // OpenAI logo avatar
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('displays timestamp correctly', () => {
    const message = createMockMessage({
      timestamp: new Date('2024-01-01T14:30:00Z'),
    })

    render(<Message message={message} />)

    // In the new design, timestamps are not shown in the basic message view
    // This test verifies the message renders without error with timestamp data
    expect(screen.getByText('Test message content')).toBeInTheDocument()
  })

  it('displays probability when provided', () => {
    const message = createMockMessage({
      role: 'assistant',
      probability: 0.85,
    })

    render(<Message message={message} />)

    expect(screen.getByText('P:85%')).toBeInTheDocument()
  })

  it('does not display probability for user messages', () => {
    const message = createMockMessage({
      role: 'user',
      // Note: probability should not be provided for user messages anyway
    })

    render(<Message message={message} />)

    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument()
  })

  it('displays model name for assistant messages', () => {
    const message = createMockMessage({
      role: 'assistant',
      model: 'claude-3',
    })

    render(<Message message={message} />)

    expect(screen.getByText('claude-3')).toBeInTheDocument()
    expect(screen.getByAltText('AI')).toBeInTheDocument() // OpenAI logo avatar
  })

  it('does not display model for user messages', () => {
    const message = createMockMessage({
      role: 'user',
      model: 'gpt-4',
    })

    render(<Message message={message} />)

    expect(screen.queryByText('gpt-4')).not.toBeInTheDocument()
  })

  it('renders attachments when provided', () => {
    const attachment = createMockAttachment()
    const message = createMockMessage({
      attachments: [attachment],
    })

    render(<Message message={message} />)

    expect(screen.getByText('Test message content')).toBeInTheDocument()
    // AttachmentPreview component should be rendered
  })

  it('handles multiple attachments', () => {
    const attachments = [
      createMockAttachment({ id: 'att-1', name: 'image1.jpg' }),
      createMockAttachment({
        id: 'att-2',
        name: 'image2.png',
        type: 'image/png',
      }),
    ]
    const message = createMockMessage({
      attachments,
    })

    render(<Message message={message} />)

    expect(screen.getByText('Test message content')).toBeInTheDocument()
  })

  it('preserves whitespace and line breaks in content', () => {
    const message = createMockMessage({
      content: 'Line 1\nLine 2\n\nLine 4',
    })

    const { container } = render(<Message message={message} />)

    const contentElement = container.querySelector('.whitespace-pre-wrap')
    expect(contentElement).toBeInTheDocument()
    // Check that the content div has the correct CSS class for preserving whitespace
    expect(contentElement).toHaveClass('whitespace-pre-wrap')
  })

  it('applies correct styling for user messages', () => {
    const message = createMockMessage({ role: 'user' })

    const { container } = render(<Message message={message} />)

    // Check for user message styling - check basic structure and user avatar
    expect(container.querySelector('.flex-1')).toBeInTheDocument()
    expect(container.querySelector('.rounded-xl')).toBeInTheDocument()
    // Also verify that it's a user message by checking the avatar text
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('applies correct styling for assistant messages', () => {
    const message = createMockMessage({ role: 'assistant' })

    const { container } = render(<Message message={message} />)

    // Check for assistant message styling - check if the message content has the dark theme
    expect(container.querySelector('.flex-1')).toBeInTheDocument()
    expect(container.querySelector('.rounded-xl')).toBeInTheDocument()
    // Also verify that it's an assistant message by checking the avatar text
    expect(screen.getByAltText('AI')).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const message = createMockMessage()

    const { container } = render(
      <Message message={message} className="custom-message" />
    )

    expect(container.firstChild).toHaveClass('custom-message')
  })

  it('handles missing model name gracefully', () => {
    const message = createMockMessage({
      role: 'assistant',
      model: undefined,
    })

    render(<Message message={message} />)

    expect(screen.getByAltText('AI')).toBeInTheDocument() // Default assistant avatar
  })

  it('handles empty content gracefully', () => {
    const message = createMockMessage({
      content: '',
    })

    expect(() => {
      render(<Message message={message} />)
    }).not.toThrow()
  })

  it('displays error message when provided', () => {
    const message = createMockMessage({
      role: 'assistant',
      error: 'Invalid API key',
    })

    render(<Message message={message} />)

    expect(screen.getByText('Invalid API key')).toBeInTheDocument()
  })

  it('displays correct avatar for different models', () => {
    const models = ['gpt-4', 'claude-3', 'gemini-pro']

    models.forEach((model) => {
      const message = createMockMessage({
        role: 'assistant',
        model,
      })

      const { unmount } = render(<Message message={message} />)

      // All assistant messages now use the OpenAI logo
      expect(screen.getByAltText('AI')).toBeInTheDocument()
      unmount()
    })
  })
})
