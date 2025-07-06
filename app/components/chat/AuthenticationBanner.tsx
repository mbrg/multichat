/**
 * Authentication Banner Component
 *
 * Focused component for authentication and API key warnings.
 * Follows Single Responsibility Principle - only handles authentication UI state.
 */

import React from 'react'
import type { Message as MessageType } from '../../types/chat'

export interface AuthenticationBannerProps {
  disabled: boolean
  isLoading: boolean
  isAuthenticated: boolean
  messages: MessageType[]
  settingsLoading: boolean
  apiKeysLoading: boolean
  hasUserInteracted?: boolean
}

export const AuthenticationBanner: React.FC<AuthenticationBannerProps> = ({
  disabled,
  isLoading,
  isAuthenticated,
  messages,
  settingsLoading,
  apiKeysLoading,
  hasUserInteracted = false,
}) => {
  // Don't show anything if not disabled or currently loading
  if (!disabled || isLoading) {
    return null
  }

  // Don't show warnings while authentication state is still loading
  if (settingsLoading || apiKeysLoading) {
    return null
  }

  // Check if we're in a possibilities state (to avoid showing banner during streaming)
  const isInPossibilitiesState =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === 'assistant' &&
    messages[messages.length - 1]?.possibilities &&
    messages[messages.length - 1].possibilities!.length > 0 &&
    !messages[messages.length - 1]?.content

  const BannerWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => (
    <div className="px-4 py-2 bg-amber-900/20 border-b border-[#2a2a2a]">
      <div className="max-w-[800px] mx-auto">
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <span>⚠️</span>
          {children}
        </div>
      </div>
    </div>
  )

  // Not authenticated - only show sign in message after user interaction
  if (!isAuthenticated && hasUserInteracted) {
    return (
      <BannerWrapper>
        <span>Sign in to save and manage your API keys securely.</span>
      </BannerWrapper>
    )
  }

  // Authenticated but no API keys configured and not in possibilities state
  if (isAuthenticated && !isInPossibilitiesState) {
    return (
      <BannerWrapper>
        <span>
          Configure API keys in the settings menu to start chatting with AI
          models.
        </span>
      </BannerWrapper>
    )
  }

  return null
}

export default AuthenticationBanner
