import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { PossibilityResponse } from '@/types/api'
import type { PossibilityMetadata } from '@/services/ai/PossibilityMetadataService'
import { getProviderLogo } from '../utils/providerLogos'

type PossibilityStatus =
  | 'pending'
  | 'loading'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled'

interface PossibilityItemVirtualizedProps {
  metadata: PossibilityMetadata
  possibility: PossibilityResponse | null
  status: PossibilityStatus
  error: string | null
  onSelect?: (response: PossibilityResponse) => void
  onRef?: (element: HTMLElement | null) => void
}

const PossibilityItemVirtualized: React.FC<PossibilityItemVirtualizedProps> = ({
  metadata,
  possibility,
  status,
  error,
  onSelect,
  onRef,
}) => {
  const elementRef = useRef<HTMLDivElement>(null)

  // Register element with parent for viewport observation
  useEffect(() => {
    onRef?.(elementRef.current)
    return () => onRef?.(null)
  }, [onRef])

  const handleClick = () => {
    if (possibility && onSelect) {
      onSelect(possibility)
    }
  }

  // Get provider icon
  const getProviderIcon = (provider: string) => {
    return (
      <Image
        src={getProviderLogo(provider, 'light')}
        alt={provider}
        width={16}
        height={16}
        className="w-full h-full object-contain"
      />
    )
  }

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-2 h-2 rounded-full bg-gray-500" title="Pending" />
        )
      case 'loading':
        return (
          <div
            className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"
            title="Loading"
          />
        )
      case 'streaming':
        return (
          <div
            className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            title="Streaming"
          />
        )
      case 'complete':
        return (
          <div className="w-2 h-2 rounded-full bg-green-500" title="Complete" />
        )
      case 'error':
        return <div className="w-2 h-2 rounded-full bg-red-500" title="Error" />
      case 'cancelled':
        return (
          <div className="w-2 h-2 rounded-full bg-gray-400" title="Cancelled" />
        )
      default:
        return (
          <div className="w-2 h-2 rounded-full bg-gray-500" title="Unknown" />
        )
    }
  }

  // Get content to display
  const getDisplayContent = () => {
    if (error) {
      return (
        <div className="text-red-400 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      )
    }

    if (status === 'pending') {
      return (
        <div className="text-gray-500 text-sm italic">Waiting to load...</div>
      )
    }

    if (status === 'loading') {
      return (
        <div className="text-yellow-400 text-sm italic">
          Connecting to {metadata.provider}...
        </div>
      )
    }

    if (status === 'streaming' || (possibility && possibility.content)) {
      const content = possibility?.content || ''
      const isStreaming = status === 'streaming'

      return (
        <div className="text-[#e0e0e0] text-sm leading-[1.5]">
          <div className="break-words max-h-[3.6em] overflow-hidden">
            {content.length > 150 ? content.slice(0, 150) + '...' : content}
            {isStreaming && (
              <span className="inline-block ml-1 w-0.5 h-4 bg-[#667eea] animate-pulse"></span>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="text-gray-500 text-sm italic">No content available</div>
    )
  }

  // Calculate probability percentage
  const probabilityPercentage = possibility?.probability
    ? Math.round(possibility.probability * 100)
    : null

  // Determine if item is clickable
  const isClickable = status === 'complete' && possibility && !error

  return (
    <div
      ref={elementRef}
      className={`
        bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3
        transition-all duration-200 flex flex-col gap-3 min-h-[170px]
        ${
          isClickable
            ? 'cursor-pointer hover:border-[#667eea] hover:bg-[#1a1a2a] hover:transform hover:translate-x-1 active:scale-[0.98]'
            : 'cursor-default'
        }
        ${status === 'error' ? 'border-red-900 bg-red-900/10' : ''}
      `}
      onClick={isClickable ? handleClick : undefined}
      data-possibility-id={metadata.id}
    >
      {/* Header with model info and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white p-1 overflow-hidden flex-shrink-0">
            {getProviderIcon(metadata.provider)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[#888] font-medium">
              {metadata.model}
            </span>
            <span className="text-xs text-[#666]">{metadata.provider}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusIndicator()}
          <span className="text-xs text-[#666] capitalize">{status}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-[60px] flex items-start">
        {getDisplayContent()}
      </div>

      {/* Footer with metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority indicator */}
          <div
            className={`
              px-2 py-1 rounded text-xs font-medium
              ${metadata.priority === 'high' ? 'bg-red-900/30 text-red-400' : ''}
              ${metadata.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' : ''}
              ${metadata.priority === 'low' ? 'bg-gray-900/30 text-gray-400' : ''}
            `}
            title={`Priority: ${metadata.priority}`}
          >
            {metadata.priority}
          </div>

          {/* System instruction indicator */}
          {metadata.systemInstruction && (
            <div
              className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs"
              title={`System: ${metadata.systemInstruction.name}`}
            >
              {metadata.systemInstruction.name}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Temperature */}
          <div
            className="bg-[#2a2a3a] px-2 py-1 rounded text-[#ffa726] font-bold text-xs"
            title="Temperature"
          >
            T:{metadata.temperature.toFixed(1)}
          </div>

          {/* Probability */}
          {probabilityPercentage !== null && (
            <div
              className="bg-[#2a2a3a] px-2 py-1 rounded text-[#667eea] font-bold text-xs"
              title="Probability Score"
            >
              P:{probabilityPercentage}%
            </div>
          )}

          {/* Loading time indicator for completed items */}
          {status === 'complete' && possibility && (
            <div
              className="bg-[#2a2a3a] px-2 py-1 rounded text-[#4ade80] font-bold text-xs"
              title="Response Time"
            >
              ✓
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PossibilityItemVirtualized
