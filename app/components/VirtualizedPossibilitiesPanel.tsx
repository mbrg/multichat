import React, { useEffect, useRef } from 'react'
import { useSimplePossibilities } from '@/hooks/useSimplePossibilities'
import type { ChatMessage, PossibilityResponse } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import type { PossibilityMetadata } from '@/services/ai/PossibilityMetadataService'
import Message from './Message'
import type { Message as ChatMessageType } from '@/types/chat'

interface VirtualizedPossibilitiesPanelProps {
  messages: ChatMessage[]
  settings: UserSettings
  isActive?: boolean
  onSelectResponse?: (response: ChatMessageType) => void
  enableVirtualScrolling?: boolean
  maxTokens?: number
}

const VirtualizedPossibilitiesPanel: React.FC<
  VirtualizedPossibilitiesPanelProps
> = ({
  messages,
  settings,
  isActive = false,
  onSelectResponse,
  enableVirtualScrolling = true,
  maxTokens,
}) => {
  const { possibilities, availableMetadata, loadPossibility } =
    useSimplePossibilities(messages, settings)

  // Track if we've loaded initial possibilities for this conversation
  const loadedConversationRef = useRef<string>('')
  const conversationKey = `${messages.length}`

  // Reset conversation tracking on mount so we can reload on remount
  useEffect(() => {
    loadedConversationRef.current = ''
  }, [])

  // Auto-load top 6 high-priority possibilities to show variety
  useEffect(() => {
    if (
      isActive &&
      messages.length > 0 &&
      loadedConversationRef.current !== conversationKey
    ) {
      loadedConversationRef.current = conversationKey

      // Get all high-priority metadata, then load them one by one
      // loadPossibility will handle duplicate prevention internally
      const allMetadata =
        new (require('@/services/ai/PossibilityMetadataService').PossibilityMetadataService)().generatePrioritizedMetadata(
          settings
        )

      const highPriority = allMetadata
        .filter(
          (m: PossibilityMetadata) =>
            m.priority === 'high' || m.priority === 'medium'
        )
        .slice(0, 12)

      highPriority.forEach((meta: PossibilityMetadata) =>
        loadPossibility(meta.id)
      )
    }
  }, [isActive, conversationKey, settings, loadPossibility, messages.length])

  return (
    <>
      {/* Header with statistics */}
      {isActive && (
        <div className="px-4 text-xs text-[#888] mb-1">
          Possibilities {possibilities.length} of{' '}
          {possibilities.length + availableMetadata.length}
        </div>
      )}

      {/* Possibility messages */}
      <div className="px-4 py-2">
        <div className="border border-[#2a2a2a] rounded-lg p-2 bg-[#0f0f0f] flex flex-col gap-2 max-h-[45vh] overflow-y-auto" data-testid="virtualized-possibilities">
          {possibilities.map((possibility) => {
            const messageData: ChatMessageType = {
              id: possibility.id,
              role: 'assistant',
              content: possibility.content,
              model: possibility.metadata.model,
              probability: possibility.probability,
              temperature: possibility.metadata.temperature,
              timestamp: new Date(),
              systemInstruction: possibility.metadata.systemInstruction
                ? possibility.metadata.systemInstruction.name
                : undefined,
              isPossibility: true,
            }

            return (
              <Message
                key={possibility.id}
                message={messageData}
                onSelectPossibility={() => onSelectResponse?.(messageData)}
                className="max-w-none"
              />
            )
          })}
          {possibilities.some((p) => !p.isComplete) && (
            <div className="text-center text-xs text-[#888] py-2">
              Generating more possibilities...
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default VirtualizedPossibilitiesPanel
