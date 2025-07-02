import React, { useState, useRef } from 'react'
import Image from 'next/image'
import type { MessageProps } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import { getProviderLogo, getProviderFromModel } from '../utils/providerLogos'

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

  const hasModelInfo = !isUser

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
              src={getProviderLogo(
                message.model ? getProviderFromModel(message.model) : 'openai',
                'light'
              )}
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
        {hasModelInfo && (
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#667eea]">
            <span className="text-[#888]">{message.model || 'unknown'}</span>
            {message.temperature !== undefined && (
              <span className="text-[#ffa726]" title="Temperature">
                T:{message.temperature.toFixed(1)}
              </span>
            )}
            {message.systemInstruction && (
              <span
                className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs font-normal"
                title={`System: ${message.systemInstruction}`}
              >
                {message.systemInstruction}
              </span>
            )}
            {message.probability !== undefined &&
              message.probability !== null && (
                <span title="Probability Score">
                  P:{Math.round(message.probability * 100)}%
                </span>
              )}
          </div>
        )}
        {/* Message Bubble */}
        <div
          onClick={() => {
            if (message.isPossibility) {
              onSelectPossibility?.(message)
            }
          }}
          className={`border rounded-xl p-4 relative word-wrap break-word overflow-wrap break-word ${
            isUser
              ? 'bg-[#2a2a3a] border-[#3a3a4a]'
              : 'bg-[#1a1a1a] border-[#2a2a2a]'
          } ${message.isPossibility ? 'border-dashed cursor-pointer hover:border-[#667eea]' : ''}`}
        >
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
                  className="max-h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#3a3a4a] scrollbar-track-[#1a1a1a]"
                >
                  {message.possibilities.map((possibility) => (
                    <div
                      key={possibility.id}
                      onClick={() => {
                        if (possibility.content) {
                          onSelectPossibility?.(possibility)
                        }
                      }}
                      className={`px-3 py-2 bg-[#1a1a1a] hover:bg-[#1a1a2a] rounded-lg transition-all border border-[#2a2a2a] hover:border-[#667eea] -webkit-tap-highlight-color-transparent cursor-pointer ${
                        possibility.content === '' ? 'animate-pulse' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-sm text-[#e0e0e0] word-wrap break-word overflow-wrap break-word line-clamp-2">
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
                        <div className="flex items-center gap-2 ml-3 text-xs text-[#888] min-w-0">
                          <div className="flex items-center gap-1 shrink-0 w-[16px]">
                            <Image
                              src={getProviderLogo(
                                possibility.model
                                  ? getProviderFromModel(possibility.model)
                                  : 'openai',
                                'dark'
                              )}
                              alt="Provider"
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-medium truncate">
                              {(() => {
                                const model = possibility.model || 'unknown'
                                // Simplify Claude model names
                                if (model.includes('claude')) {
                                  return model
                                    .replace(/claude-/i, 'c-')
                                    .replace(/-\d{8}$/, '') // Remove date suffix like -20241022
                                    .replace(/-latest$/, '')
                                }
                                return model
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {possibility.temperature !== undefined && (
                              <span
                                className="text-[#ffa726] font-medium min-w-[44px]"
                                title="Temperature"
                              >
                                T:{possibility.temperature.toFixed(1)}
                              </span>
                            )}
                            {possibility.systemInstruction && (
                              <span
                                className="text-[#a78bfa] font-medium min-w-[60px] truncate"
                                title="System Instruction"
                              >
                                {possibility.systemInstruction}
                              </span>
                            )}
                            {possibility.probability !== undefined &&
                              possibility.probability !== null && (
                                <span
                                  className="text-[#667eea] font-medium min-w-[44px]"
                                  title="Probability Score"
                                >
                                  P:{Math.round(possibility.probability * 100)}%
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
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
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Message
