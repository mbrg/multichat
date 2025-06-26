/**
 * Messages List Component
 *
 * Focused component for message rendering and empty state.
 * Follows Single Responsibility Principle - only handles message display logic.
 */

import React, { useRef, useEffect } from 'react'
import type { Message as MessageType } from '../../types/chat'
import MessageWithIndependentPossibilities from '../MessageWithIndependentPossibilities'

export interface MessagesListProps {
  messages: MessageType[]
  onSelectPossibility?: (
    userMessage: MessageType,
    possibility: MessageType
  ) => void
  onContinuePossibility?: (possibility: MessageType) => void
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  onSelectPossibility,
  onContinuePossibility,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectPossibility = (
    userMessage: MessageType,
    possibility: MessageType
  ) => {
    onSelectPossibility?.(userMessage, possibility)
  }

  const handleContinuePossibility = (possibility: MessageType) => {
    onContinuePossibility?.(possibility)
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col gap-4 -webkit-overflow-scrolling-touch">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[#888]">
          <p className="text-lg">Start a conversation...</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageWithIndependentPossibilities
            key={message.id}
            message={message}
            onSelectPossibility={handleSelectPossibility}
            onContinuePossibility={handleContinuePossibility}
            className="max-w-[800px] w-full self-center animate-fadeIn"
            showPossibilities={message.role === 'assistant' && !message.content}
            conversationMessages={messages}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessagesList
