/**
 * Chat Header Component
 *
 * Focused component for chat header with title and menu.
 * Follows Single Responsibility Principle - only handles header UI.
 */

import React from 'react'
import Menu from '../Menu'
import PublishButton from './PublishButton'

export interface ChatHeaderProps {
  onOpenSettings: (
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
  ) => void
  onPublishConversation?: () => Promise<{ url: string; id: string } | void>
  onTitleClick: () => void
  hasMessages: boolean
  isGenerating: boolean
  isPublishing: boolean
  isAuthenticated?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  onPublishConversation,
  onTitleClick,
  hasMessages,
  isGenerating,
  isPublishing,
  isAuthenticated = true,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <button
        onClick={onTitleClick}
        className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer"
        aria-label="Go to home page"
      >
        chatsbox.ai
      </button>

      <div className="flex items-center gap-3">
        <PublishButton
          onPublish={onPublishConversation || (() => Promise.resolve())}
          hasMessages={hasMessages}
          isGenerating={isGenerating}
          isLoading={isPublishing}
          disabled={!isAuthenticated || !onPublishConversation}
        />
        <Menu onOpenSettings={onOpenSettings} />
      </div>
    </div>
  )
}

export default ChatHeader
