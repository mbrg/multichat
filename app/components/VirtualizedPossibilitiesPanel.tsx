import React, { useEffect } from 'react'
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

  // Auto-load top 6 high-priority possibilities to show variety
  useEffect(() => {
    if (isActive && messages.length > 0) {
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
  }, [isActive, messages, loadPossibility, settings])

  // Load more possibilities when scrolling near the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target

    // If we're near the bottom (within 100px), load more
    if (
      scrollHeight - scrollTop - clientHeight < 100 &&
      availableMetadata.length > 0
    ) {
      // Load next batch of possibilities
      const nextBatch = availableMetadata.slice(0, 6)
      nextBatch.forEach((meta: PossibilityMetadata) => loadPossibility(meta.id))
    }
  }

  return (
    <>
      {/* Header with statistics - outside the panel */}
      {isActive && (
        <div className="px-4 py-2 text-xs text-[#888] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              {possibilities.length > 0
                ? `${possibilities.filter((p) => p.isComplete).length} of ${possibilities.length} possibilities`
                : 'Preparing possibilities...'}
            </span>
            <div className="flex items-center gap-2 text-[#666]">
              <span className="text-[#4ade80]">
                ✓ {possibilities.filter((p) => p.isComplete).length}
              </span>
              <span className="text-[#fbbf24]">
                ⟳ {possibilities.filter((p) => !p.isComplete).length}
              </span>
              <span className="text-[#6b7280]">
                ⋯ {availableMetadata.length}
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
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent"
          onScroll={handleScroll}
        >
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

            {/* Load more possibilities grouped by provider */}
            {availableMetadata.length > 0 && (
              <div className="text-center py-4">
                <div className="text-xs text-[#666] mb-3">
                  {availableMetadata.length} more possibilities available
                </div>

                {/* Group by provider and show provider-specific buttons */}
                {(() => {
                  const providerGroups = availableMetadata.reduce(
                    (
                      groups: Record<string, PossibilityMetadata[]>,
                      meta: PossibilityMetadata
                    ) => {
                      if (!groups[meta.provider]) groups[meta.provider] = []
                      groups[meta.provider].push(meta)
                      return groups
                    },
                    {}
                  )

                  return (
                    <div className="flex flex-wrap gap-3 justify-center max-w-2xl mx-auto">
                      {Object.entries(providerGroups).map(
                        ([provider, metas]) => (
                          <button
                            key={provider}
                            onClick={() => {
                              // Load next 3 possibilities from this provider
                              const nextBatch = metas.slice(0, 3)
                              nextBatch.forEach((meta: PossibilityMetadata) =>
                                loadPossibility(meta.id)
                              )
                            }}
                            className="px-4 py-2 bg-[#2a2a3a] border border-[#3a3a4a] text-[#888] rounded-md text-sm hover:border-[#667eea] hover:text-gray-200 transition-colors flex items-center gap-2"
                          >
                            <span className="capitalize">{provider}</span>
                            <span className="text-xs text-[#666]">
                              +{metas.length}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )
                })()}

                {/* Show individual possibilities if user wants more control */}
                <details className="mt-4">
                  <summary className="text-xs text-[#666] cursor-pointer hover:text-gray-200">
                    View individual possibilities
                  </summary>
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto mt-3">
                    {availableMetadata
                      .slice(0, 12)
                      .map((meta: PossibilityMetadata) => (
                        <button
                          key={meta.id}
                          onClick={() => loadPossibility(meta.id)}
                          className="px-3 py-1 bg-[#2a2a3a] border border-[#3a3a4a] text-[#888] rounded text-xs hover:border-[#667eea] hover:text-gray-200 transition-colors"
                        >
                          {meta.provider} {meta.model} T:{meta.temperature}
                        </button>
                      ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default VirtualizedPossibilitiesPanel
