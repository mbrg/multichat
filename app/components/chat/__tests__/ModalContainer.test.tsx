import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalContainer } from '../ModalContainer'

// Mock the Settings component
vi.mock('../../Settings', () => ({
  default: ({
    isOpen,
    onClose,
    initialSection,
  }: {
    isOpen: boolean
    onClose: () => void
    initialSection?: string
  }) =>
    isOpen ? (
      <div data-testid="settings-modal" data-initial-section={initialSection}>
        <button onClick={onClose} data-testid="close-settings">
          Close Settings
        </button>
        Settings Modal Content
      </div>
    ) : null,
}))

// Mock the AuthPopup component
vi.mock('../../AuthPopup', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="auth-popup">
        <button onClick={onClose} data-testid="close-auth">
          Close Auth
        </button>
        Auth Popup Content
      </div>
    ) : null,
}))

describe('ModalContainer', () => {
  const defaultProps = {
    showSettings: false,
    settingsSection: undefined as
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
      | undefined,
    onCloseSettings: vi.fn(),
    showAuthPopup: false,
    onCloseAuthPopup: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Settings Modal', () => {
    it('should not render Settings when showSettings is false', () => {
      render(<ModalContainer {...defaultProps} showSettings={false} />)

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    })

    it('should render Settings when showSettings is true', () => {
      render(<ModalContainer {...defaultProps} showSettings={true} />)

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      expect(screen.getByText('Settings Modal Content')).toBeInTheDocument()
    })

    it('should pass isOpen prop correctly to Settings', () => {
      const { rerender } = render(
        <ModalContainer {...defaultProps} showSettings={false} />
      )
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()

      rerender(<ModalContainer {...defaultProps} showSettings={true} />)
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    })

    it('should pass onClose callback to Settings', async () => {
      const mockOnCloseSettings = vi.fn()

      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          onCloseSettings={mockOnCloseSettings}
        />
      )

      const closeButton = screen.getByTestId('close-settings')
      closeButton.click()

      expect(mockOnCloseSettings).toHaveBeenCalledTimes(1)
    })

    it('should pass settingsSection as initialSection to Settings', () => {
      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          settingsSection="api-keys"
        />
      )

      const settingsModal = screen.getByTestId('settings-modal')
      expect(settingsModal).toHaveAttribute('data-initial-section', 'api-keys')
    })

    it('should handle undefined settingsSection', () => {
      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          settingsSection={undefined}
        />
      )

      const settingsModal = screen.getByTestId('settings-modal')
      expect(settingsModal).not.toHaveAttribute('data-initial-section')
    })

    it('should handle all valid settingsSection values', () => {
      const sections: Array<
        | 'api-keys'
        | 'system-instructions'
        | 'temperatures'
        | 'models'
        | 'generation'
      > = [
        'api-keys',
        'system-instructions',
        'temperatures',
        'models',
        'generation',
      ]

      sections.forEach((section) => {
        const { rerender } = render(
          <ModalContainer
            {...defaultProps}
            showSettings={true}
            settingsSection={section}
          />
        )

        const settingsModal = screen.getByTestId('settings-modal')
        expect(settingsModal).toHaveAttribute('data-initial-section', section)

        rerender(<div />)
      })
    })
  })

  describe('Auth Popup', () => {
    it('should not render AuthPopup when showAuthPopup is false', () => {
      render(<ModalContainer {...defaultProps} showAuthPopup={false} />)

      expect(screen.queryByTestId('auth-popup')).not.toBeInTheDocument()
    })

    it('should render AuthPopup when showAuthPopup is true', () => {
      render(<ModalContainer {...defaultProps} showAuthPopup={true} />)

      expect(screen.getByTestId('auth-popup')).toBeInTheDocument()
      expect(screen.getByText('Auth Popup Content')).toBeInTheDocument()
    })

    it('should pass isOpen prop correctly to AuthPopup', () => {
      const { rerender } = render(
        <ModalContainer {...defaultProps} showAuthPopup={false} />
      )
      expect(screen.queryByTestId('auth-popup')).not.toBeInTheDocument()

      rerender(<ModalContainer {...defaultProps} showAuthPopup={true} />)
      expect(screen.getByTestId('auth-popup')).toBeInTheDocument()
    })

    it('should pass onClose callback to AuthPopup', async () => {
      const mockOnCloseAuthPopup = vi.fn()

      render(
        <ModalContainer
          {...defaultProps}
          showAuthPopup={true}
          onCloseAuthPopup={mockOnCloseAuthPopup}
        />
      )

      const closeButton = screen.getByTestId('close-auth')
      closeButton.click()

      expect(mockOnCloseAuthPopup).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Modals', () => {
    it('should render both modals when both are enabled', () => {
      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          showAuthPopup={true}
        />
      )

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      expect(screen.getByTestId('auth-popup')).toBeInTheDocument()
    })

    it('should handle independent state changes', () => {
      const { rerender } = render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          showAuthPopup={false}
        />
      )

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      expect(screen.queryByTestId('auth-popup')).not.toBeInTheDocument()

      rerender(
        <ModalContainer
          {...defaultProps}
          showSettings={false}
          showAuthPopup={true}
        />
      )

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
      expect(screen.getByTestId('auth-popup')).toBeInTheDocument()
    })

    it('should handle independent callback triggers', async () => {
      const mockOnCloseSettings = vi.fn()
      const mockOnCloseAuthPopup = vi.fn()

      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          showAuthPopup={true}
          onCloseSettings={mockOnCloseSettings}
          onCloseAuthPopup={mockOnCloseAuthPopup}
        />
      )

      const closeSettingsButton = screen.getByTestId('close-settings')
      const closeAuthButton = screen.getByTestId('close-auth')

      closeSettingsButton.click()
      expect(mockOnCloseSettings).toHaveBeenCalledTimes(1)
      expect(mockOnCloseAuthPopup).not.toHaveBeenCalled()

      closeAuthButton.click()
      expect(mockOnCloseSettings).toHaveBeenCalledTimes(1)
      expect(mockOnCloseAuthPopup).toHaveBeenCalledTimes(1)
    })
  })

  describe('Component Structure', () => {
    it('should render a React Fragment as root element', () => {
      const { container } = render(<ModalContainer {...defaultProps} />)

      // React Fragment doesn't create a wrapper element
      expect(container.firstChild).toBeNull()
    })

    it('should maintain correct order of modals in DOM', () => {
      render(
        <ModalContainer
          {...defaultProps}
          showSettings={true}
          showAuthPopup={true}
        />
      )

      const allTestElements = screen.getAllByTestId(/settings-modal|auth-popup/)
      expect(allTestElements[0]).toHaveAttribute(
        'data-testid',
        'settings-modal'
      )
      expect(allTestElements[1]).toHaveAttribute('data-testid', 'auth-popup')
    })
  })

  describe('Props Validation', () => {
    it('should work with minimal required props', () => {
      const minimalProps = {
        showSettings: false,
        onCloseSettings: vi.fn(),
        showAuthPopup: false,
        onCloseAuthPopup: vi.fn(),
      }

      expect(() => {
        render(<ModalContainer {...minimalProps} />)
      }).not.toThrow()
    })

    it('should handle all props being false/undefined', () => {
      const allFalseProps = {
        showSettings: false,
        settingsSection: undefined,
        onCloseSettings: vi.fn(),
        showAuthPopup: false,
        onCloseAuthPopup: vi.fn(),
      }

      const { container } = render(<ModalContainer {...allFalseProps} />)
      expect(container.firstChild).toBeNull()
    })
  })
})
