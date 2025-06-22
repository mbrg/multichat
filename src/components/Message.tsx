import React from 'react'
import type { MessageProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'

const Message: React.FC<MessageProps> = ({
  message,
  className = ''
}) => {
  const isUser = message.role === 'user'
  
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}>
      <div className={`flex max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
            isUser ? 'bg-blue-600' : 'bg-gray-600'
          }`}>
            {isUser ? 'U' : (message.model ? message.model.charAt(0).toUpperCase() : 'A')}
          </div>
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Message Bubble */}
          <div className={`px-4 py-2 rounded-2xl ${
            isUser 
              ? 'bg-blue-600 text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    className="max-w-xs"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <span>{formatTime(message.timestamp)}</span>
            {message.model && !isUser && (
              <>
                <span>•</span>
                <span className="font-medium">{message.model}</span>
              </>
            )}
            {message.probability && !isUser && (
              <>
                <span>•</span>
                <span className="text-green-600 font-medium">
                  {Math.round(message.probability * 100)}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Message