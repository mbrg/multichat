import React, { useState, useRef } from 'react'
import type { MessageProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import openaiLogo from '../assets/OpenAI-black-monoblossom.svg'

const Message: React.FC<MessageProps> = ({
  message,
  onSelectPossibility,
  className = '',
}) => {
  const isUser = message.role === 'user'
  const [visiblePossibilities, setVisiblePossibilities] = useState(3)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Simulate loading more possibilities
  const loadMorePossibilities = async () => {
    if (isLoadingMore || !message.possibilities) return

    setIsLoadingMore(true)
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    setVisiblePossibilities((prev) =>
      Math.min(prev + 3, message.possibilities!.length + 10)
    )
    setIsLoadingMore(false)
  }

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMorePossibilities()
    }
  }

  return (
    <div className={`flex gap-3 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${
            isUser
              ? 'bg-[#4a5568] rounded-full text-white'
              : 'rounded-lg overflow-hidden bg-white p-1'
          }`}
        >
          {isUser ? (
            'U'
          ) : (
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
        <div
          className={`border rounded-xl p-4 relative word-wrap break-word overflow-wrap break-word ${
            isUser
              ? 'bg-[#2a2a3a] border-[#3a3a4a]'
              : 'bg-[#1a1a1a] border-[#2a2a2a]'
          }`}
        >
          {/* Model Info for AI messages */}
          {!isUser && (message.model || message.probability || message.temperature !== undefined) && (
            <div className="absolute -top-2 right-4 bg-[#2a2a3a] px-3 py-1 rounded text-[#667eea] text-xs font-bold border border-[#3a3a4a] flex items-center gap-2">
              {message.model && (
                <span className="text-[#888]">{message.model}</span>
              )}
              {message.temperature !== undefined && (
                <span className="text-[#ffa726]" title="Temperature">T:{message.temperature?.toFixed(1)}</span>
              )}
              {message.probability && (
                <span title="Probability Score">P:{Math.round(message.probability * 100)}%</span>
              )}
            </div>
          )}

          {message.content && (
            <div className="text-sm leading-relaxed text-[#e0e0e0] whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

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
          {!isUser &&
            message.possibilities &&
            message.possibilities.length > 0 && (
              <div className={message.content ? 'mt-3 space-y-2' : 'space-y-2'}>
                {message.content && (
                  <div className="text-xs text-[#888] font-medium">
                    Other possibilities:
                  </div>
                )}
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  className="max-h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#3a3a4a] scrollbar-track-[#1a1a1a]"
                >
                  {message.possibilities
                    .slice(0, visiblePossibilities)
                    .map((possibility) => (
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
                              <span className="font-medium">
                                {possibility.model}
                              </span>
                            )}
                            {possibility.temperature !== undefined && (
                              <span className="text-[#ffa726] font-medium" title="Temperature">
                                T:{possibility.temperature?.toFixed(1)}
                              </span>
                            )}
                            {possibility.probability && (
                              <span className="text-[#667eea] font-medium" title="Probability Score">
                                P:{Math.round(possibility.probability * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {isLoadingMore && (
                    <div className="px-3 py-2 text-center text-xs text-[#888]">
                      Loading more possibilities...
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Message
