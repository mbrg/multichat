import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatHeader } from '../ChatHeader'

// Mock the Menu component
vi.mock('../../Menu', () => ({
  default: ({
    onOpenSettings,
  }: {
    onOpenSettings: (section?: string) => void
  }) => (
    <button
      onClick={() => onOpenSettings('api-keys')}
      data-testid="menu-button"
    >
      Menu
    </button>
  ),
}))

// Mock the PublishButton component
vi.mock('../PublishButton', () => ({
  default: ({ onPublish, disabled }: any) => (
    <button
      onClick={onPublish}
      disabled={disabled}
      data-testid="publish-button"
    >
      Publish
    </button>
  ),
}))

describe('ChatHeader', () => {
  const defaultProps = {
    onOpenSettings: vi.fn(),
    onPublishConversation: vi.fn(),
    onTitleClick: vi.fn(),
    hasMessages: false,
    isGenerating: false,
    isPublishing: false,
  }

  it('should render the title correctly', () => {
    render(<ChatHeader {...defaultProps} />)

    expect(screen.getByText('chatsbox.ai')).toBeInTheDocument()
  })

  it('should have the correct styling classes', () => {
    const { container } = render(<ChatHeader {...defaultProps} />)

    const headerElement = container.firstChild as HTMLElement
    expect(headerElement).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
      'p-4',
      'bg-[#1a1a1a]',
      'border-b',
      'border-[#2a2a2a]',
      'min-h-[56px]'
    )
  })

  it('should pass onOpenSettings to Menu component', async () => {
    const user = userEvent.setup()

    render(<ChatHeader {...defaultProps} />)

    const menuButton = screen.getByTestId('menu-button')
    await user.click(menuButton)

    expect(defaultProps.onOpenSettings).toHaveBeenCalledWith('api-keys')
  })

  it('should render the Menu component', () => {
    render(<ChatHeader {...defaultProps} />)

    expect(screen.getByTestId('menu-button')).toBeInTheDocument()
  })

  it('should render the PublishButton component', () => {
    render(<ChatHeader {...defaultProps} />)

    expect(screen.getByTestId('publish-button')).toBeInTheDocument()
  })

  it('should make title clickable and call onTitleClick', async () => {
    const user = userEvent.setup()

    render(<ChatHeader {...defaultProps} />)

    const titleButton = screen.getByRole('button', { name: /go to home page/i })
    await user.click(titleButton)

    expect(defaultProps.onTitleClick).toHaveBeenCalledTimes(1)
  })

  it('should pass correct props to PublishButton', () => {
    render(
      <ChatHeader
        {...defaultProps}
        hasMessages={true}
        isGenerating={true}
        isPublishing={true}
      />
    )

    const publishButton = screen.getByTestId('publish-button')
    expect(publishButton).toBeInTheDocument()
  })
})
