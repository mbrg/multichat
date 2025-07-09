/**
 * Message Input Container Component
 *
 * Focused component for message input with dynamic placeholder logic.
 * Follows Single Responsibility Principle - only handles input area UI and logic.
 */

import React from 'react'
import type { Message as MessageType, Attachment } from '../../types/chat'
import MessageInput from '../MessageInput'

export interface MessageInputContainerProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void
  isLoading: boolean
  disabled: boolean
  isAuthenticated: boolean
  messages: MessageType[]
  settingsLoading: boolean
  apiKeysLoading: boolean
  hasUnselectedPossibilities?: boolean
}

export const MessageInputContainer: React.FC<MessageInputContainerProps> = ({
  onSendMessage,
  isLoading,
  disabled,
  isAuthenticated,
  messages,
  settingsLoading,
  apiKeysLoading,
  hasUnselectedPossibilities = false,
}) => {
  /**
   * Determine the appropriate placeholder text based on current state
   */
  // Check if we're in a possibilities selection state (saved or live)
  const lastMessage = messages[messages.length - 1]
  const hasSavedPossibilities =
    messages.length > 0 &&
    lastMessage?.role === 'assistant' &&
    lastMessage?.possibilities &&
    lastMessage.possibilities.length > 0 &&
    !lastMessage?.content

  // Determine if input should be disabled due to unselected possibilities
  const isDisabledByPossibilities =
    hasSavedPossibilities || hasUnselectedPossibilities

  const getPlaceholder = (): string => {
    if (isLoading) {
      return 'Generating response...'
    }

    // Show loading message while settings or API keys are loading
    if (settingsLoading || apiKeysLoading) {
      return 'Loading...'
    }

    // Check for possibilities first (higher priority than other disabled states)
    if (isDisabledByPossibilities) {
      return 'Select a possibility to continue...'
    }

    if (!disabled) {
      return 'Type message...'
    }

    // Disabled state - determine why
    if (!isAuthenticated) {
      return 'Sign in to start chatting...'
    }

    // Default disabled state - no API keys configured
    return 'Configure API keys in settings...'
  }

  return (
    <div className="border-t border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="p-4">
        <div className="max-w-[800px] mx-auto">
          <MessageInput
            onSendMessage={onSendMessage}
            disabled={
              isLoading ||
              disabled ||
              settingsLoading ||
              apiKeysLoading ||
              isDisabledByPossibilities
            }
            placeholder={getPlaceholder()}
            className="bg-[#0a0a0a] border-[#2a2a2a] text-[#e0e0e0] placeholder-[#666] focus:border-[#667eea]"
          />
        </div>
      </div>

      {/* Developer-focused footer */}
      <div className="border-t border-[#2a2a2a] bg-[#0a0a0a] px-4 py-3">
        <div className="max-w-[800px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#888]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  />
                  <circle cx="12" cy="12" r="3" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M1 1l22 22"
                  />
                </svg>
                <span>Conversations not stored unless shared</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span>by</span>
              <a
                href="https://mbgsec.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#888] hover:text-[#667eea] transition-colors"
              >
                mbrg0
              </a>
              <span>•</span>
              <a
                href="https://github.com/mbrg/multichat"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#888] hover:text-[#667eea] transition-colors"
              >
                <span>OSS</span>
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageInputContainer
