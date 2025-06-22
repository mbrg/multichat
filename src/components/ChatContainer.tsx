import React, { useEffect, useRef } from 'react'
import type { ChatContainerProps } from '../types/chat'
import Message from './Message'
import MessageInput from './MessageInput'

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-lg">Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t bg-gray-50 p-4">
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          placeholder={isLoading ? "Generating response..." : "Type a message..."}
        />
      </div>
    </div>
  )
}

export default ChatContainer