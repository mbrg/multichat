import React, { useEffect, useRef } from 'react'
import { useSimplePossibilities } from '@/hooks/useSimplePossibilities'
import type { ChatMessage, PossibilityResponse } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import type { PossibilityMetadata } from '@/services/ai/PossibilityMetadataService'
import { getModelById } from '@/services/ai/config'
import OptionCard from './OptionCard'
import type { ResponseOption } from '@/types'

interface VirtualizedPossibilitiesPanelProps {
  messages: ChatMessage[]
  settings: UserSettings
  isActive?: boolean
  onSelectResponse?: (response: ResponseOption) => void
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
  maxTokens = 100,
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
      {/* Header with statistics - outside the panel */}
      {isActive && (
        <div className="px-4 py-1 text-xs text-[#888] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {possibilities.length > 0
                ? 'Possibilities'
                : 'Preparing possibilities...'}
            </span>
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
          ${isActive ? 'max-h-[45vh]' : 'max-h-0'}
        `}
      >
        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
          <div className="px-4 py-2">
            {/* Show streaming possibilities */}
            <div className="flex flex-col gap-2 max-w-[1200px] mx-auto">
              {possibilities.map((possibility) => {
                // Get model config for alias
                const modelConfig = getModelById(possibility.metadata.model)

                // Convert to ResponseOption format for OptionCard
                const responseOption: ResponseOption & {
                  systemInstruction?: { name: string }
                } = {
                  id: possibility.id,
                  model: {
                    id: possibility.metadata.model,
                    name: modelConfig?.alias || possibility.metadata.model,
                    provider: possibility.metadata.provider,
                    icon: '', // Will be handled by OptionCard
                    maxTokens: 0,
                    supportsLogprobs: false,
                  },
                  content: possibility.content,
                  probability: possibility.probability,
                  temperature: possibility.metadata.temperature,
                  isStreaming: !possibility.isComplete,
                  timestamp: new Date(),
                  systemInstruction: possibility.metadata.systemInstruction
                    ? { name: possibility.metadata.systemInstruction.name }
                    : undefined,
                }

                return (
                  <OptionCard
                    key={possibility.id}
                    response={responseOption}
                    onSelect={onSelectResponse}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default VirtualizedPossibilitiesPanel
