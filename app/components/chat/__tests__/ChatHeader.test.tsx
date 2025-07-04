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

describe('ChatHeader', () => {
  it('should render the title correctly', () => {
    const mockOnOpenSettings = vi.fn()

    render(<ChatHeader onOpenSettings={mockOnOpenSettings} />)

    expect(screen.getByText('chatsbox.ai')).toBeInTheDocument()
  })

  it('should have the correct styling classes', () => {
    const mockOnOpenSettings = vi.fn()

    const { container } = render(
      <ChatHeader onOpenSettings={mockOnOpenSettings} />
    )

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
    const mockOnOpenSettings = vi.fn()
    const user = userEvent.setup()

    render(<ChatHeader onOpenSettings={mockOnOpenSettings} />)

    const menuButton = screen.getByTestId('menu-button')
    await user.click(menuButton)

    expect(mockOnOpenSettings).toHaveBeenCalledWith('api-keys')
  })

  it('should render the Menu component', () => {
    const mockOnOpenSettings = vi.fn()

    render(<ChatHeader onOpenSettings={mockOnOpenSettings} />)

    expect(screen.getByTestId('menu-button')).toBeInTheDocument()
  })
})
