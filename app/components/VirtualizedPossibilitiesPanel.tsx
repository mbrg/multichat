import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useVirtualizedPossibilities } from '@/hooks/useVirtualizedPossibilities'
import type { ChatMessage, PossibilityResponse } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import PossibilityItemVirtualized from './PossibilityItemVirtualized'
import LoadingSkeleton from './LoadingSkeleton'

interface VirtualizedPossibilitiesPanelProps {
  messages: ChatMessage[]
  settings: UserSettings
  isActive?: boolean
  onSelectResponse?: (response: PossibilityResponse) => void
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
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const virtualizedPossibilities = useVirtualizedPossibilities({
    itemHeight: 180, // Height for each possibility item
    containerHeight: 400, // Default container height
    bufferSize: 3, // Items to render outside viewport
    preloadDistance: '300px', // Start loading 300px before viewport
    maxConcurrentConnections: 8, // Concurrent API calls
    enableVirtualScrolling,
    loadingStrategy: 'viewport', // Load when entering viewport
  })

  const {
    virtualState,
    virtualItems,
    possibilityPool,
    initialize,
    updateScrollPosition,
    updateContainerHeight,
    registerItem,
    unregisterItem,
    getLoadingStats,
  } = virtualizedPossibilities

  // Initialize when component mounts or props change
  useEffect(() => {
    if (isActive && messages.length > 0) {
      initialize(messages, settings, { maxTokens })
      setIsInitialized(true)
    }
  }, [isActive, messages, settings, maxTokens, initialize])

  // Update container height when panel becomes active
  useEffect(() => {
    if (isActive && containerRef.current) {
      const height = containerRef.current.clientHeight
      updateContainerHeight(height)
    }
  }, [isActive, updateContainerHeight])

  // Handle scroll events
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = event.currentTarget.scrollTop
      updateScrollPosition(scrollTop)
    },
    [updateScrollPosition]
  )

  // Get loading statistics
  const stats = getLoadingStats()

  // Handle item registration for lazy loading
  const handleItemRef = useCallback(
    (id: string, element: HTMLElement | null) => {
      if (element) {
        registerItem(id, element)
      } else {
        unregisterItem(id)
      }
    },
    [registerItem, unregisterItem]
  )

  // Render virtual spacer for items outside viewport
  const renderVirtualSpacer = (height: number, key: string) => (
    <div key={key} style={{ height: `${height}px` }} />
  )

  return (
    <div
      ref={containerRef}
      className={`
        bg-[#0f0f0f] border-t border-[#2a2a2a] 
        flex flex-col transition-all duration-300 ease-out overflow-hidden
        ${isActive ? 'max-h-[45vh]' : 'max-h-0'}
      `}
    >
      {/* Header with statistics */}
      <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#2a2a2a] text-xs text-[#888] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            {stats.total > 0
              ? `${stats.completed} of ${stats.total} possibilities`
              : 'Preparing possibilities...'}
          </span>
          {stats.total > 0 && (
            <div className="flex items-center gap-2 text-[#666]">
              <span className="text-[#4ade80]">✓ {stats.completed}</span>
              <span className="text-[#fbbf24]">⟳ {stats.loading}</span>
              <span className="text-[#6b7280]">
                ⋯ {stats.total - stats.completed - stats.loading}
              </span>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {stats.loading > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-[#667eea] rounded-full animate-bounce delay-200"></div>
          </div>
        )}
      </div>

      {/* Scrollable area with virtual scrolling */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent"
        onScroll={handleScroll}
      >
        <div className="px-4 py-2">
          {enableVirtualScrolling ? (
            // Virtual scrolling mode
            <div
              style={{
                height: `${virtualState.totalHeight}px`,
                position: 'relative',
              }}
            >
              {virtualItems.map((item, index) => {
                const possibility = possibilityPool.getPossibilityResult(
                  item.id
                )
                const status = possibilityPool.getPossibilityStatus(item.id)
                const error = possibilityPool.getPossibilityError(item.id)

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      top: `${item.top}px`,
                      height: `${item.height}px`,
                      width: '100%',
                    }}
                  >
                    <PossibilityItemVirtualized
                      metadata={item.metadata}
                      possibility={possibility}
                      status={status}
                      error={error}
                      onSelect={onSelectResponse}
                      onRef={(element) => handleItemRef(item.id, element)}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            // Standard scrolling mode - show all items
            <div className="flex flex-col gap-2 max-w-[1200px] mx-auto">
              {Array.from(possibilityPool.poolState.items.values()).map(
                (item) => {
                  const possibility = possibilityPool.getPossibilityResult(
                    item.metadata.id
                  )
                  const status = possibilityPool.getPossibilityStatus(
                    item.metadata.id
                  )
                  const error = possibilityPool.getPossibilityError(
                    item.metadata.id
                  )

                  return (
                    <PossibilityItemVirtualized
                      key={item.metadata.id}
                      metadata={item.metadata}
                      possibility={possibility}
                      status={status}
                      error={error}
                      onSelect={onSelectResponse}
                      onRef={(element) =>
                        handleItemRef(item.metadata.id, element)
                      }
                    />
                  )
                }
              )}
            </div>
          )}

          {/* Show initial loading skeletons if no items yet */}
          {!isInitialized && isActive && (
            <div className="flex flex-col gap-2 max-w-[1200px] mx-auto">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingSkeleton key={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with controls */}
      {isActive && stats.total > 0 && (
        <div className="px-4 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a] flex items-center justify-between text-xs text-[#666]">
          <div className="flex items-center gap-4">
            <span>
              Virtual scrolling: {enableVirtualScrolling ? 'On' : 'Off'}
            </span>
            {enableVirtualScrolling && (
              <span>
                Showing {virtualItems.length} of {stats.total} items
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stats.completed > 0 && (
              <button
                onClick={() => {
                  if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTop = 0
                  }
                }}
                className="px-2 py-1 bg-[#2a2a3a] border border-[#3a3a4a] text-[#888] rounded text-xs hover:border-[#667eea] hover:text-gray-200 transition-colors"
              >
                ↑ Top
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VirtualizedPossibilitiesPanel
