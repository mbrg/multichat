/**
 * Chat Header Component
 *
 * Focused component for chat header with title and menu.
 * Follows Single Responsibility Principle - only handles header UI.
 */

'use client'
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
  linkCopied?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  onPublish,
  publishDisabled = false,
  linkCopied = false,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <Link
        href="/"
        className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent"
      >
        chatsbox.ai
      </Link>
      <div className="flex items-center gap-4">
        {onPublish && (
          <div className="relative">
            <button
              onClick={onPublish}
              disabled={publishDisabled}
              className={`p-2 rounded-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(102,126,234,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none`}
              aria-label="Publish"
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
                  d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7m-5-4l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </button>
            {linkCopied && (
              <span
                className="absolute -top-1 -right-2 text-xs text-green-400 animate-fadeInOut"
                role="status"
                aria-label="Copied to clipboard"
              >
                📋
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
