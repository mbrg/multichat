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
    <div className="border-t border-[#2a2a2a] bg-[#1a1a1a] p-4">
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
  )
}

export default MessageInputContainer
