/**
 * Chat Header Component
 *
 * Focused component for chat header with title and menu.
 * Follows Single Responsibility Principle - only handles header UI.
 */

import React from 'react'
import Link from 'next/link'
import Menu from '../Menu'
import PublishButton from '../PublishButton'

import type { Message } from '../../types/chat'

export interface ChatHeaderProps {
  onOpenSettings: (
    section?:
      | 'api-keys'
      | 'system-instructions'
      | 'temperatures'
      | 'models'
      | 'generation'
  ) => void
  messages: Message[]
  isGeneratingPossibilities: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenSettings,
  messages,
  isGeneratingPossibilities,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
      <Link
        href="/"
        className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent"
      >
        chatsbox.ai
      </Link>
      <div className="flex items-center gap-2">
        <PublishButton
          messages={messages}
          disabled={messages.length === 0 || isGeneratingPossibilities}
        />
        <Menu onOpenSettings={onOpenSettings} />
      </div>
    </div>
  )
}

export default ChatHeader
