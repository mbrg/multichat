import React, { useMemo } from 'react'
import type { ResponseOption } from '../types'
import OptionCard from './OptionCard'
import { compareProbabilities } from '../utils/logprobs'

interface PossibilitiesPanelProps {
  responses: ResponseOption[]
  isLoading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  isActive?: boolean
  onSelectResponse?: (response: ResponseOption) => void
}

const PossibilitiesPanel: React.FC<PossibilitiesPanelProps> = ({
  responses,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  isActive = false,
  onSelectResponse,
}) => {
  const sortedResponses = useMemo(
    () =>
      [...responses].sort((a, b) =>
        compareProbabilities(a.probability, b.probability)
      ),
    [responses]
  )

  return (
    <div
      className={`
        bg-[#0f0f0f] border-t border-[#2a2a2a] 
        flex flex-col transition-all duration-300 ease-out overflow-hidden
        ${isActive ? 'max-h-[35vh]' : 'max-h-0'}
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] text-xs text-[#888] flex items-center justify-between">
        <span>
          {isLoading
            ? 'Loading possibilities...'
            : `${sortedResponses.length} possibilities found`}
        </span>
        {isLoading && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-200"></div>
          </div>
        )}
      </div>

      {/* Scrollable Options */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-2">
          {sortedResponses.map((response) => (
            <OptionCard
              key={response.id}
              response={response}
              onSelect={onSelectResponse}
            />
          ))}

          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                className="px-4 py-2 bg-[#2a2a3a] border border-[#3a3a4a] text-[#888] rounded hover:border-[#667eea] hover:text-gray-200 disabled:opacity-50 transition-colors text-sm"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PossibilitiesPanel
