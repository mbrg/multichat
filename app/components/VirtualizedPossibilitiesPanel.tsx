import React, { useEffect, useRef } from 'react'
import { useSimplePossibilities } from '@/hooks/useSimplePossibilities'
import type { ChatMessage } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import type { PossibilityMetadata } from '@/services/ai/PossibilityMetadataService'
import { getModelById } from '@/services/ai/config'
import Message from './Message'
import type { Message as ChatMessageType } from '../types/chat'

interface VirtualizedPossibilitiesPanelProps {
  messages: ChatMessage[]
  settings: UserSettings
  isActive?: boolean
  showBackground?: boolean
  onSelectResponse?: (response: ChatMessageType) => void
  enableVirtualScrolling?: boolean
  maxTokens?: number
  onPossibilitiesFinished?: () => void
  onPossibilitiesChange?: (getCompletedPossibilities: () => any[]) => void
  onClearPossibilities?: (clearFn: () => void) => void
}

const VirtualizedPossibilitiesPanel: React.FC<
  VirtualizedPossibilitiesPanelProps
> = ({
  messages,
  settings,
  isActive = false,
  showBackground = false,
  onSelectResponse,
  enableVirtualScrolling = true,
  maxTokens,
  onPossibilitiesFinished,
  onPossibilitiesChange,
  onClearPossibilities,
}) => {
  const {
    possibilities,
    loadPossibility,
    getCompletedPossibilities,
    clearPossibilities,
  } = useSimplePossibilities(messages, settings)

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
        .slice(0, settings.maxInitialPossibilities ?? 12)

      highPriority.forEach((meta: PossibilityMetadata) =>
        loadPossibility(meta.id)
      )
    }
  }, [isActive, conversationKey, settings, loadPossibility, messages.length])

  // Track when all possibilities have finished loading
  const finishedTrackingRef = useRef<string>('')
  useEffect(() => {
    if (
      isActive &&
      possibilities.length > 0 &&
      possibilities.every((p) => p.isComplete) &&
      finishedTrackingRef.current !== conversationKey &&
      onPossibilitiesFinished
    ) {
      finishedTrackingRef.current = conversationKey
      onPossibilitiesFinished()
    }
  }, [isActive, possibilities, conversationKey, onPossibilitiesFinished])

  // Notify parent when possibilities change
  useEffect(() => {
    if (onPossibilitiesChange) {
      onPossibilitiesChange(getCompletedPossibilities)
    }
  }, [onPossibilitiesChange, getCompletedPossibilities])

  // Provide clear function to parent
  useEffect(() => {
    if (onClearPossibilities) {
      onClearPossibilities(clearPossibilities)
    }
  }, [onClearPossibilities, clearPossibilities])

  return (
    <>
      {/* Header with statistics - outside the panel */}
      {isActive && (
        <div className="px-4 py-1 text-xs text-[#888] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>{possibilities.length} possibilities</span>
            <div className="flex items-center gap-2 text-[#666]">
              <span className="text-[#4ade80]">
                ✓ {possibilities.filter((p) => p.isComplete).length}
              </span>
              <span className="text-[#fbbf24]">
                ⟳ {possibilities.filter((p) => !p.isComplete).length}
              </span>
            </div>
          </div>

          {/* Loading indicator */}
          {possibilities.some((p) => !p.isComplete) && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-100"></div>
              <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-200"></div>
            </div>
          )}
        </div>
      )}

      {/* Panel with possibilities */}
      <div
        className={`
          bg-[#0f0f0f] border-t border-[#2a2a2a] 
          flex flex-col transition-all duration-300 ease-out overflow-hidden
          ${isActive ? 'max-h-[45vh]' : showBackground ? 'max-h-[45vh]' : 'max-h-0'}
        `}
      >
        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
          <div className="px-4 py-2">
            {isActive ? (
              /* Show streaming possibilities */
              <div className="flex flex-col gap-2 max-w-[1200px] mx-auto">
                {possibilities.map((possibility) => {
                  const modelConfig = getModelById(possibility.metadata.model)

                  const msg: ChatMessageType = {
                    id: possibility.id,
                    role: 'assistant',
                    content: possibility.content,
                    model: modelConfig?.alias || possibility.metadata.model,
                    probability: possibility.probability,
                    temperature: possibility.metadata.temperature,
                    timestamp: new Date(),
                    systemInstruction:
                      possibility.metadata.systemInstruction?.name,
                    isPossibility: true,
                    error: possibility.error || undefined,
                  }

                  return (
                    <Message
                      key={possibility.id}
                      message={msg}
                      onSelectPossibility={onSelectResponse}
                      className="max-w-[800px] w-full"
                    />
                  )
                })}
              </div>
            ) : showBackground ? (
              /* Show placeholder when background is visible but functionality is disabled */
              <div className="flex flex-col items-center justify-center py-8 text-[#666] max-w-[1200px] mx-auto">
                <div className="text-sm">
                  Live possibilities are disabled for shared conversations
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

export default VirtualizedPossibilitiesPanel
