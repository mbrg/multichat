/**
 * Chat Header Component
 *
 * Focused component for chat header with title and menu.
 * Follows Single Responsibility Principle - only handles header UI.
 */

import React from 'react'
import Menu from '../Menu'

export interface ChatHeaderProps {
  onOpenSettings: (
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
  ) => void
  onPublish?: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  onPublish,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <div className="flex items-center gap-4">
        <div className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          chatsbox.ai
        </div>
        {onPublish && (
          <button
            onClick={onPublish}
            className="text-sm text-[#aaa] hover:text-white"
          >
            Publish
          </button>
        )}
      </div>
      <Menu onOpenSettings={onOpenSettings} />
    </div>
  )
}

export default ChatHeader
