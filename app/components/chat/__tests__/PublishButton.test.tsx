import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublishButton } from '../PublishButton'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
})

describe('PublishButton', () => {
  const mockOnPublish = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render enabled when conversation has messages and possibilities are complete', () => {
    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={true}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('should be disabled when no messages', () => {
    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={false}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    expect(button).toBeDisabled()
  })

  it('should be disabled when still generating possibilities', () => {
    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={true}
        isGenerating={true}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    expect(button).toBeDisabled()
  })

  it('should show loading state when publishing', () => {
    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={true}
        hasMessages={true}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    expect(button).toBeDisabled()
    expect(screen.getByText('Publishing...')).toBeInTheDocument()
  })

  it('should call onPublish when clicked', async () => {
    const user = userEvent.setup()

    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={true}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    await user.click(button)

    expect(mockOnPublish).toHaveBeenCalledTimes(1)
  })

  it('should show share menu after successful publish', async () => {
    const user = userEvent.setup()

    // Mock successful publish that returns URL and ID
    mockOnPublish.mockImplementation(async () => {
      return {
        url: 'http://localhost:3000/conversation/test-id',
        id: 'test-id',
      }
    })

    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={true}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Conversation Shared!')).toBeInTheDocument()
    })

    // Should show share menu options
    expect(screen.getByText('Copy Share URL')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('Undo Share')).toBeInTheDocument()
  })

  it('should have gradient styling matching send button', () => {
    render(
      <PublishButton
        onPublish={mockOnPublish}
        disabled={false}
        isLoading={false}
        hasMessages={true}
        isGenerating={false}
      />
    )

    const button = screen.getByRole('button', { name: /publish conversation/i })
    expect(button).toHaveClass(
      'bg-gradient-to-r',
      'from-[#667eea]',
      'to-[#764ba2]'
    )
  })
})
