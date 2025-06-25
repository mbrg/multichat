import React from 'react'
import Image from 'next/image'
import type { Message } from '../types/chat'
import AttachmentPreview from './AttachmentPreview'
import VirtualizedPossibilitiesPanel from './VirtualizedPossibilitiesPanel'
import { getProviderLogo, getProviderFromModel } from '../utils/providerLogos'
import { useSettings } from '../hooks/useSettings'

interface MessageWithIndependentPossibilitiesProps {
  message: Message
  onSelectPossibility?: (possibility: Message) => void
  onContinuePossibility?: (possibility: Message) => void
  className?: string
  showPossibilities?: boolean
}

const MessageWithIndependentPossibilities: React.FC<
  MessageWithIndependentPossibilitiesProps
> = ({
  message,
  onSelectPossibility,
  onContinuePossibility,
  className = '',
  showPossibilities = true,
}) => {
  const isUser = message.role === 'user'
  const { settings } = useSettings()

  // Convert Message selection callback to handle VirtualizedPossibilitiesPanel response format
  const handleSelectResponse = (response: any) => {
    // Convert PossibilityResponse back to Message format for compatibility
    const messageResponse: Message = {
      id: response.id,
      role: 'assistant',
      content: response.content,
      model: response.model,
      temperature: response.temperature,
      probability: response.probability,
      timestamp: response.timestamp || new Date(),
      systemInstruction: response.systemInstruction,
      isPossibility: true,
    }
    onSelectPossibility?.(messageResponse)
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
              src={getProviderLogo(
                getProviderFromModel(message.model || 'openai'),
                'dark'
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

          {/* Independent Streaming Possibilities Panel */}
          {!isUser && showPossibilities && !message.content && settings && (
            <div className="mt-3">
              <div className="text-xs text-[#888] font-medium mb-2">
                Possibilities:
              </div>
              <VirtualizedPossibilitiesPanel
                messages={[message]}
                settings={settings}
                isActive={true}
                onSelectResponse={handleSelectResponse}
                enableVirtualScrolling={true}
                maxTokens={100}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageWithIndependentPossibilities
