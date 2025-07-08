import React from 'react'
import Image from 'next/image'
import type { Message } from '../types/chat'
import type { ChatMessage } from '../types/api'
import AttachmentPreview from './AttachmentPreview'
import VirtualizedPossibilitiesPanel from './VirtualizedPossibilitiesPanel'
import MessageComponent from './Message'
import { getProviderLogo, getProviderFromModel } from '../utils/providerLogos'
import { useSettings } from '../hooks/useSettings'
import { TOKEN_LIMITS } from '../services/ai/config'
import { log } from '@/services/LoggingService'

interface MessageWithIndependentPossibilitiesProps {
  message: Message
  onSelectPossibility?: (userMessage: Message, possibility: Message) => void
  onContinuePossibility?: (possibility: Message) => void
  className?: string
  showPossibilities?: boolean
  conversationMessages?: Message[]
  onPossibilitiesFinished?: () => void
  onPossibilitiesChange?: (getCompletedPossibilities: () => any[]) => void
  onClearPossibilities?: (clearFn: () => void) => void
  disableLivePossibilities?: boolean
}

const MessageWithIndependentPossibilities: React.FC<
  MessageWithIndependentPossibilitiesProps
> = ({
  message,
  onSelectPossibility,
  onContinuePossibility,
  className = '',
  showPossibilities = true,
  conversationMessages = [],
  onPossibilitiesFinished,
  onPossibilitiesChange,
  onClearPossibilities,
  disableLivePossibilities = false,
}) => {
  const isUser = message.role === 'user'
  const { settings } = useSettings()

  // Log message details for debugging possibilities
  log.debug('MessageWithIndependentPossibilities render', {
    messageId: message.id,
    messageRole: message.role,
    hasContent: !!message.content,
    contentLength: message.content?.length || 0,
    hasPossibilities: !!message.possibilities,
    possibilitiesCount: message.possibilities?.length || 0,
    showPossibilities,
    disableLivePossibilities,
  })

  // Helper function to get display model name (same as OptionCard)
  const getDisplayModelName = (modelName: string): string => {
    // Trim Anthropic model names: claude-3-5-sonnet-20241022 -> c-3-5-sonnet
    if (modelName.includes('claude')) {
      return modelName
        .replace('claude-', 'c-')
        .replace(/-\d{8}$/, '') // Remove date suffix
        .replace(/-\d{6}$/, '') // Remove shorter date suffix
    }
    return modelName
  }

  // Convert conversation messages to ChatMessage format for the possibilities system
  const convertToChatMessages = (messages: Message[]): ChatMessage[] => {
    return messages.map(
      (msg): ChatMessage => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })
    )
  }

  // Convert Message selection callback to handle VirtualizedPossibilitiesPanel response format
  const handleSelectResponse = (response: any) => {
    // Convert PossibilityResponse back to Message format for compatibility
    const messageResponse: Message = {
      id: response.id,
      role: 'assistant',
      content: response.content,
      model:
        typeof response.model === 'string'
          ? response.model
          : response.model?.id,
      temperature: response.temperature,
      probability: response.probability,
      timestamp: response.timestamp || new Date(),
      systemInstruction:
        response.systemInstruction?.name || response.systemInstruction,
      isPossibility: true,
    }

    // Find the last user message from the conversation to pass as the first parameter
    const lastUserMessage = conversationMessages
      .filter((m) => m.role === 'user')
      .pop()
    if (lastUserMessage) {
      onSelectPossibility?.(lastUserMessage, messageResponse)
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
              src={getProviderLogo(
                typeof message.model === 'string'
                  ? message.model
                    ? getProviderFromModel(message.model)
                    : 'openai'
                  : (message.model as any)?.provider || 'openai',
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
        {/* Message Bubble */}
        <div
          className={`border rounded-xl relative word-wrap break-word overflow-wrap break-word ${
            isUser
              ? 'bg-[#2a2a3a] border-[#3a3a4a]'
              : 'bg-[#1a1a1a] border-[#2a2a2a]'
          }`}
        >
          {/* Model Info for AI messages */}
          {!isUser &&
            (message.model ||
              message.probability ||
              message.temperature !== undefined ||
              message.systemInstruction) && (
              <div className="absolute -top-2 right-4 bg-[#2a2a3a] px-3 py-1 rounded text-xs font-bold border border-[#3a3a4a] flex items-center gap-2 z-10">
                {message.model && (
                  <span className="text-[#888]">
                    {getDisplayModelName(message.model)}
                  </span>
                )}
                {message.temperature !== undefined && (
                  <span className="text-[#ffa726]" title="Temperature">
                    T:{message.temperature?.toFixed(1)}
                  </span>
                )}
                {message.systemInstruction && (
                  <span
                    className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded"
                    title={`System: ${message.systemInstruction}`}
                  >
                    {message.systemInstruction}
                  </span>
                )}
                {message.probability && (
                  <span className="text-[#667eea]" title="Probability Score">
                    P:{Math.round(message.probability * 100)}%
                  </span>
                )}
              </div>
            )}

          {/* Message Content Container */}
          <div className={isUser ? 'p-4' : 'pt-6 pb-4 px-4'}>
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

            {/* Saved Possibilities - Reuse VirtualizedPossibilitiesPanel for consistency */}
            {!isUser &&
              message.possibilities &&
              message.possibilities.length > 0 && (
                <div className="mt-3">
                  {(() => {
                    log.debug(
                      'Rendering saved possibilities using VirtualizedPossibilitiesPanel',
                      {
                        messageId: message.id,
                        savedPossibilitiesCount: message.possibilities.length,
                        possibilityIds: message.possibilities.map((p) => p.id),
                        messageHasContent: !!message.content,
                      }
                    )
                    return null
                  })()}
                  {settings && (
                    <VirtualizedPossibilitiesPanel
                      messages={[]}
                      settings={settings}
                      isActive={false}
                      showBackground={true}
                      savedPossibilities={message.possibilities}
                      onSelectResponse={handleSelectResponse}
                      enableVirtualScrolling={false}
                    />
                  )}
                </div>
              )}

            {/* Independent Streaming Possibilities Panel */}
            {!isUser &&
              showPossibilities &&
              !message.content &&
              settings &&
              !message.possibilities?.length && (
                <div className="mt-3">
                  {(() => {
                    log.debug('Showing live possibilities panel', {
                      messageId: message.id,
                      showPossibilities,
                      hasContent: !!message.content,
                      disableLivePossibilities,
                      isActive: !disableLivePossibilities,
                    })
                    return null
                  })()}
                  <VirtualizedPossibilitiesPanel
                    messages={(() => {
                      console.debug(
                        '[MessageWithIndependentPossibilities] Original conversationMessages:',
                        conversationMessages
                      )
                      // Filter out empty messages, especially trailing empty assistant messages
                      const filteredMessages = conversationMessages.filter(
                        (msg) => msg.content && msg.content.trim() !== ''
                      )
                      console.debug(
                        '[MessageWithIndependentPossibilities] Filtered messages:',
                        filteredMessages
                      )
                      const converted = convertToChatMessages(filteredMessages)
                      console.debug(
                        '[MessageWithIndependentPossibilities] Converted ChatMessages:',
                        converted
                      )
                      return converted
                    })()}
                    settings={settings}
                    isActive={!disableLivePossibilities}
                    showBackground={true}
                    onSelectResponse={handleSelectResponse}
                    enableVirtualScrolling={true}
                    maxTokens={TOKEN_LIMITS.POSSIBILITY_DEFAULT}
                    onPossibilitiesFinished={onPossibilitiesFinished}
                    onPossibilitiesChange={onPossibilitiesChange}
                    onClearPossibilities={onClearPossibilities}
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageWithIndependentPossibilities
