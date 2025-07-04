/**
 * Chat Header Component
 *
 * Focused component for chat header with title and menu.
 * Follows Single Responsibility Principle - only handles header UI.
 */

import React from 'react'
import Link from 'next/link'
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
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  onPublish,
  publishDisabled = false,
}) => {
  const [showCopy, setShowCopy] = React.useState(false)

  const handlePublish = async () => {
    if (!onPublish) return
    await onPublish()
    setShowCopy(true)
    setTimeout(() => setShowCopy(false), 2000)
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <Link
        href="/"
        className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent"
      >
        chatsbox.ai
      </Link>
      <div className="flex items-center gap-2">
        {onPublish && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishDisabled}
            aria-label="Publish conversation"
            className="p-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-md hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:transform-none disabled:hover:shadow-none"
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
                d="M4 4v6a2 2 0 002 2h6"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10l6-6m0 0H10m10 0v10"
              />
            </svg>
          </button>
        )}
        {showCopy && <span className="text-xs animate-fadeInOut">Copied!</span>}
        <Menu onOpenSettings={onOpenSettings} />
      </div>
    </div>
  )
}

export default ChatHeader
