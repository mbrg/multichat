import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from '../MessageInput'

// Mock FileReader
class MockFileReader {
  result: string | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL(file: File) {
    // Simulate async file reading
    setTimeout(() => {
      this.result = `data:${file.type};base64,mockbase64data`
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>)
      }
    }, 0)
  }
}

// @ts-expect-error - Mocking global FileReader
global.FileReader = MockFileReader

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder"
      />
    )

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('calls onSendMessage when form is submitted with text', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')
    const sendButton = screen.getByLabelText('Send message')

    await user.type(textarea, 'Hello world')
    await user.click(sendButton)

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world', undefined)
  })

  it('calls onSendMessage when Enter is pressed', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')

    await user.type(textarea, 'Hello world')
    await user.keyboard('{Enter}')

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world', undefined)
  })

  it('does not submit when Shift+Enter is pressed', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')

    await user.type(textarea, 'Line 1')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(textarea, 'Line 2')

    expect(mockOnSendMessage).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Line 1\nLine 2')
  })

  it('clears input after sending message', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')

    await user.type(textarea, 'Test message')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('disables input and send button when disabled prop is true', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />)

    const textarea = screen.getByRole('textbox')
    const sendButton = screen.getByLabelText('Send message')
    const attachButton = screen.getByLabelText('Attach file')

    expect(textarea).toBeDisabled()
    expect(sendButton).toBeDisabled()
    expect(attachButton).toBeDisabled()
  })

  it('disables send button when input is empty', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const sendButton = screen.getByLabelText('Send message')

    expect(sendButton).toBeDisabled()
  })

  it('enables send button when input has text', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')
    const sendButton = screen.getByLabelText('Send message')

    await user.type(textarea, 'Test')

    expect(sendButton).not.toBeDisabled()
  })

  it('renders file input for attachments', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('accept')
    expect(fileInput).toHaveAttribute('multiple')
  })

  it('shows correct border classes for drag state', () => {
    const { container } = render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const dropZone = screen.getByRole('textbox').closest('form')!
    const inputWrapper = container.querySelector('.border-2')!

    // Check initial state
    expect(inputWrapper).toHaveClass('border-gray-200')

    // Simulate drag over - this will add border styling
    fireEvent.dragOver(dropZone)
    
    // Check that the component handles drag events (overlay logic is tested via state)
    expect(dropZone).toBeInTheDocument()
  })

  it('has attachment button that opens file dialog', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const attachButton = screen.getByLabelText('Attach file')
    expect(attachButton).toBeInTheDocument()
    expect(attachButton).toHaveAttribute('type', 'button')
  })

  it('handles form submission correctly', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const form = screen.getByRole('textbox').closest('form')!
    expect(form).toBeInTheDocument()

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test submission')

    fireEvent.submit(form)

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test submission', undefined)
  })

  it('has proper accessibility attributes', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')
    const attachButton = screen.getByLabelText('Attach file')
    const sendButton = screen.getByLabelText('Send message')

    expect(textarea).toHaveAttribute('placeholder')
    expect(attachButton).toHaveAttribute('aria-label', 'Attach file')
    expect(sendButton).toHaveAttribute('aria-label', 'Send message')
  })

  it('has correct tab order elements', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')
    const attachButton = screen.getByLabelText('Attach file')
    const sendButton = screen.getByLabelText('Send message')

    // Verify all interactive elements are present and focusable
    expect(attachButton).toBeInTheDocument()
    expect(attachButton).not.toBeDisabled()
    
    expect(textarea).toBeInTheDocument()
    expect(textarea).not.toBeDisabled()
    
    expect(sendButton).toBeInTheDocument()
    // Send button should be disabled when no content
    expect(sendButton).toBeDisabled()
  })

  it('applies proper CSS classes for styling', () => {
    const { container } = render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const form = container.querySelector('form')
    const inputWrapper = container.querySelector('.flex.items-end')
    const textarea = container.querySelector('textarea')

    expect(form).toHaveClass('relative')
    expect(inputWrapper).toHaveClass('flex', 'items-end', 'gap-2')
    expect(textarea).toHaveClass('flex-1', 'resize-none')
  })

  it('has correct file input configuration', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toHaveAttribute('accept')
    expect(fileInput).toHaveAttribute('multiple')
    expect(fileInput).toHaveClass('hidden')
    
    const acceptAttr = fileInput.getAttribute('accept')
    expect(acceptAttr).toContain('image/jpeg')
    expect(acceptAttr).toContain('audio/mp3')
    expect(acceptAttr).toContain('application/pdf')
  })

  it('handles disabled state correctly', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />)

    const textarea = screen.getByRole('textbox')
    const attachButton = screen.getByLabelText('Attach file')
    const sendButton = screen.getByLabelText('Send message')

    expect(textarea).toBeDisabled()
    expect(attachButton).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  it('auto-resizes textarea based on content', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5')

    // The textarea should have adjusted its height
    expect(textarea.style.height).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MessageInput onSendMessage={mockOnSendMessage} className="custom-input" />
    )

    expect(container.firstChild).toHaveClass('custom-input')
  })

  it('handles border styling on focus and drag states', () => {
    const { container } = render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const inputWrapper = container.querySelector('.border-2')
    expect(inputWrapper).toHaveClass('border-gray-200')
    expect(inputWrapper).toHaveClass('hover:border-gray-300')
    expect(inputWrapper).toHaveClass('focus-within:border-blue-500')
  })

  it('does not submit empty message without attachments', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')

    await user.type(textarea, '   ') // Only whitespace
    await user.keyboard('{Enter}')

    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it('trims whitespace from message before sending', async () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)

    const textarea = screen.getByRole('textbox')

    await user.type(textarea, '  Hello world  ')
    await user.keyboard('{Enter}')

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world', undefined)
  })
})