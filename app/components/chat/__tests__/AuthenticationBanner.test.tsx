import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthenticationBanner } from '../AuthenticationBanner'
import type { Message as MessageType } from '../../../types/chat'

const createMockMessage = (
  overrides: Partial<MessageType> = {}
): MessageType => ({
  id: '1',
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
  ...overrides,
})

describe('AuthenticationBanner', () => {
  const defaultProps = {
    disabled: false,
    isLoading: false,
    isAuthenticated: true,
    messages: [],
    settingsLoading: false,
    apiKeysLoading: false,
  }

  describe('when not disabled', () => {
    it('should not render anything when not disabled', () => {
      const { container } = render(
        <AuthenticationBanner {...defaultProps} disabled={false} />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('when loading', () => {
    it('should not render anything when isLoading is true', () => {
      const { container } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          isLoading={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when settingsLoading is true', () => {
      const { container } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          settingsLoading={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when apiKeysLoading is true', () => {
      const { container } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          apiKeysLoading={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render anything when both settings and API keys are loading', () => {
      const { container } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          settingsLoading={true}
          apiKeysLoading={true}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('when disabled and not loading', () => {
    describe('not authenticated', () => {
      it('should show sign in message after user interaction', () => {
        render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={false}
            hasUserInteracted={true}
          />
        )

        expect(screen.getByText('⚠️')).toBeInTheDocument()
        expect(
          screen.getByText('Sign in to save and manage your API keys securely.')
        ).toBeInTheDocument()
      })

      it('should not show sign in message before user interaction', () => {
        render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={false}
            hasUserInteracted={false}
          />
        )

        expect(screen.queryByText('⚠️')).not.toBeInTheDocument()
        expect(
          screen.queryByText(
            'Sign in to save and manage your API keys securely.'
          )
        ).not.toBeInTheDocument()
      })

      it('should have correct styling classes', () => {
        const { container } = render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={false}
            hasUserInteracted={true}
          />
        )

        const bannerElement = container.firstChild as HTMLElement
        expect(bannerElement).toHaveClass(
          'px-4',
          'py-2',
          'bg-amber-900/20',
          'border-b',
          'border-[#2a2a2a]'
        )
      })
    })

    describe('authenticated but no API keys', () => {
      it('should show API keys configuration message', () => {
        render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={true}
            messages={[]}
          />
        )

        expect(screen.getByText('⚠️')).toBeInTheDocument()
        expect(
          screen.getByText(
            'Configure API keys in the settings menu to start chatting with AI models.'
          )
        ).toBeInTheDocument()
      })

      it('should not show banner when in possibilities state', () => {
        const messagesWithPossibilities = [
          createMockMessage({
            role: 'assistant',
            content: '', // No content indicates we're showing possibilities
            possibilities: [
              createMockMessage({ id: 'poss1', content: 'Possibility 1' }),
              createMockMessage({ id: 'poss2', content: 'Possibility 2' }),
            ],
          }),
        ]

        const { container } = render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={true}
            messages={messagesWithPossibilities}
          />
        )

        expect(container.firstChild).toBeNull()
      })

      it('should show banner when assistant message has content (not in possibilities state)', () => {
        const messagesWithContent = [
          createMockMessage({
            role: 'assistant',
            content: 'This is a complete response',
            possibilities: [],
          }),
        ]

        render(
          <AuthenticationBanner
            {...defaultProps}
            disabled={true}
            isLoading={false}
            isAuthenticated={true}
            messages={messagesWithContent}
          />
        )

        expect(
          screen.getByText(
            'Configure API keys in the settings menu to start chatting with AI models.'
          )
        ).toBeInTheDocument()
      })
    })
  })

  describe('banner wrapper styling', () => {
    it('should have consistent styling across different banner types', () => {
      const { container: unauthContainer } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          isAuthenticated={false}
          hasUserInteracted={true}
        />
      )

      const { container: authContainer } = render(
        <AuthenticationBanner
          {...defaultProps}
          disabled={true}
          isAuthenticated={true}
          messages={[]}
        />
      )

      const unauthBanner = unauthContainer.firstChild as HTMLElement
      const authBanner = authContainer.firstChild as HTMLElement

      // Both should have the same wrapper classes
      expect(unauthBanner.className).toBe(authBanner.className)
    })
  })
})
