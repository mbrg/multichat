import React from 'react'
import type { MessageProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import openaiLogo from '../assets/OpenAI-black-monoblossom.svg'

const Message: React.FC<MessageProps> = ({
  message,
  onSelectPossibility,
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
    <div className={`flex gap-3 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
          isUser 
            ? 'bg-[#4a5568] rounded-full text-white' 
            : 'rounded-lg overflow-hidden bg-white p-1'
        }`}>
          {isUser ? 'U' : (
            <img 
              src={openaiLogo} 
              alt="AI"
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1">
        {/* Message Bubble */}
        <div className={`border rounded-xl p-4 relative word-wrap break-word overflow-wrap break-word ${
          isUser 
            ? 'bg-[#2a2a3a] border-[#3a3a4a]' 
            : 'bg-[#1a1a1a] border-[#2a2a2a]'
        }`}>
          {/* Model Info for AI messages */}
          {!isUser && (message.model || message.probability) && (
            <div className="absolute -top-2 right-4 bg-[#2a2a3a] px-3 py-1 rounded text-[#667eea] text-xs font-bold border border-[#3a3a4a] flex items-center gap-2">
              {message.model && <span className="text-[#888]">{message.model}</span>}
              {message.probability && <span>{Math.round(message.probability * 100)}%</span>}
            </div>
          )}
          
          <div className="text-sm leading-relaxed text-[#e0e0e0] whitespace-pre-wrap break-words">
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

          {/* Possibilities Panel */}
          {!isUser && message.possibilities && message.possibilities.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-[#888] font-medium">Other possibilities:</div>
              <div className="space-y-1">
                {message.possibilities.map((possibility) => (
                  <div
                    key={possibility.id}
                    onClick={() => onSelectPossibility?.(possibility)}
                    className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#1a1a2a] rounded-lg cursor-pointer transition-all border border-[#2a2a2a] hover:border-[#667eea] -webkit-tap-highlight-color-transparent"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-sm text-[#e0e0e0] line-clamp-2 word-wrap break-word overflow-wrap break-word">
                        {possibility.content}
                      </div>
                      <div className="flex items-center gap-2 ml-3 text-xs text-[#888]">
                        {possibility.model && (
                          <span className="font-medium">{possibility.model}</span>
                        )}
                        {possibility.probability && (
                          <span className="text-[#667eea] font-medium">
                            {Math.round(possibility.probability * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Message