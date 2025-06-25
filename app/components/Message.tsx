import React, { useState, useRef } from 'react'
import Image from 'next/image'
import type { MessageProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import openaiLogo from '../assets/OpenAI-black-monoblossom.svg'

interface ExtendedMessageProps extends MessageProps {
  onContinuePossibility?: (possibility: any) => void
}

const Message: React.FC<ExtendedMessageProps> = ({
  message,
  onSelectPossibility,
  onContinuePossibility,
  className = '',
}) => {
  const isUser = message.role === 'user'
  const [visiblePossibilities, setVisiblePossibilities] = useState(3)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [expandedPossibility, setExpandedPossibility] = useState<string | null>(
    null
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  // Check if possibilities are still streaming in
  const hasActivePossibilities =
    !isUser && message.possibilities && message.possibilities.length > 0
  const isStreamingPossibilities =
    hasActivePossibilities &&
    message.possibilities!.some(
      (p) =>
        p.content === '' ||
        (p.content &&
          !p.content.trim().endsWith('.') &&
          !p.content.trim().endsWith('!') &&
          !p.content.trim().endsWith('?'))
    )

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
            <Image
              src={openaiLogo}
              alt="AI"
              width={24}
              height={24}
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
          {!isUser &&
            (message.model ||
              message.probability ||
              message.temperature !== undefined) && (
              <div className="absolute -top-2 right-4 bg-[#2a2a3a] px-3 py-1 rounded text-[#667eea] text-xs font-bold border border-[#3a3a4a] flex items-center gap-2">
                {message.model && (
                  <span className="text-[#888]">{message.model}</span>
                )}
                {message.temperature !== undefined && (
                  <span className="text-[#ffa726]" title="Temperature">
                    T:{message.temperature?.toFixed(1)}
                  </span>
                )}
                {message.probability && (
                  <span title="Probability Score">
                    P:{Math.round(message.probability * 100)}%
                  </span>
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
                        className={`px-3 py-2 bg-[#1a1a1a] hover:bg-[#1a1a2a] rounded-lg transition-all border border-[#2a2a2a] hover:border-[#667eea] -webkit-tap-highlight-color-transparent ${
                          possibility.content === '' ? 'animate-pulse' : ''
                        } ${expandedPossibility === possibility.id ? 'border-[#667eea]' : ''}`}
                      >
                        <div
                          onClick={() => onSelectPossibility?.(possibility)}
                          className="cursor-pointer hover:bg-[#1a1a2a]"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className={`flex-1 text-sm text-[#e0e0e0] word-wrap break-word overflow-wrap break-word ${
                                expandedPossibility === possibility.id
                                  ? ''
                                  : 'line-clamp-2'
                              }`}
                            >
                              {possibility.content || (
                                <span className="text-[#666] italic">
                                  Generating response...
                                </span>
                              )}
                              {possibility.content &&
                                possibility.content.length > 0 && (
                                  <span className="inline-block w-1 h-4 bg-[#667eea] ml-1 animate-pulse" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-3 text-xs text-[#888]">
                              {possibility.model && (
                                <span className="font-medium">
                                  {possibility.model}
                                </span>
                              )}
                              {possibility.temperature !== undefined && (
                                <span
                                  className="text-[#ffa726] font-medium"
                                  title="Temperature"
                                >
                                  T:{possibility.temperature?.toFixed(1)}
                                </span>
                              )}
                              {possibility.probability !== undefined &&
                                possibility.probability !== null && (
                                  <span
                                    className="text-[#667eea] font-medium"
                                    title="Probability Score"
                                  >
                                    P:
                                    {Math.round(possibility.probability * 100)}%
                                  </span>
                                )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (expandedPossibility === possibility.id) {
                                    setExpandedPossibility(null)
                                  } else {
                                    setExpandedPossibility(possibility.id)
                                  }
                                }}
                                className="ml-2 p-1 hover:bg-[#2a2a3a] rounded text-[#888] hover:text-[#e0e0e0] transition-colors"
                                title="Expand options"
                              >
                                {expandedPossibility === possibility.id ? '▼' : '▶'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons when expanded */}
                        {expandedPossibility === possibility.id &&
                          possibility.content && (
                            <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectPossibility?.(possibility)
                                }}
                                className="flex-1 px-3 py-1.5 bg-[#667eea] hover:bg-[#5a6fd8] text-white text-xs font-medium rounded transition-colors"
                              >
                                Use This Response
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onContinuePossibility?.(possibility)
                                }}
                                className="flex-1 px-3 py-1.5 bg-[#2a2a3a] hover:bg-[#3a3a4a] text-[#e0e0e0] text-xs font-medium rounded border border-[#3a3a4a] transition-colors"
                              >
                                Continue Writing
                              </button>
                            </div>
                          )}
                      </div>
                    ))}
                  {isStreamingPossibilities && (
                    <div className="px-3 py-2 text-center text-xs text-[#888] animate-pulse">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-[#667eea] rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span>Generating more possibilities...</span>
                      </div>
                    </div>
                  )}
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
