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
  publishDisabled?: boolean
  showCopied?: boolean
  onTitleClick?: () => void
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  onPublish,
  publishDisabled = false,
  showCopied = false,
  onTitleClick,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <div
        className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent cursor-pointer"
        onClick={onTitleClick}
      >
        chatsbox.ai
      </div>
      <div className="flex items-center gap-3">
        {onPublish && (
          <div className="relative">
            <button
              onClick={onPublish}
              disabled={publishDisabled}
              className="flex-shrink-0 p-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-md hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Publish conversation"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7m0 0l-7 7m7-7H6"
                />
              </svg>
            </button>
            {showCopied && (
              <span className="absolute -top-2 -right-2 text-xs animate-fadeInOut">
                Copied
              </span>
            )}
          </div>
        )}
        <Menu onOpenSettings={onOpenSettings} />
      </div>
    </div>
  )
}

export default ChatHeader
