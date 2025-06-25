import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useLazyLoading } from './useViewportObserver'
import {
  usePossibilityPool,
  type UsePossibilityPoolReturn,
} from './usePossibilityPool'
import type { PossibilityMetadata } from '@/services/ai/PossibilityMetadataService'
import type { ChatMessage, PossibilityResponse } from '@/types/api'
import type { UserSettings } from '@/types/settings'

export interface VirtualizedItem {
  id: string
  index: number
  isVisible: boolean
  isLoaded: boolean
  top: number
  height: number
  metadata: PossibilityMetadata
}

export interface VirtualScrollState {
  scrollTop: number
  containerHeight: number
  totalHeight: number
  visibleStartIndex: number
  visibleEndIndex: number
  bufferSize: number
}

export interface UseVirtualizedPossibilitiesOptions {
  itemHeight?: number
  containerHeight?: number
  bufferSize?: number
  preloadDistance?: string
  maxConcurrentConnections?: number
  enableVirtualScrolling?: boolean
  loadingStrategy?: 'viewport' | 'progressive' | 'on-demand'
}

export interface UseVirtualizedPossibilitiesReturn {
  // Virtual scrolling state
  virtualState: VirtualScrollState
  virtualItems: VirtualizedItem[]

  // Possibility pool
  possibilityPool: UsePossibilityPoolReturn

  // Actions
  initialize: (
    messages: ChatMessage[],
    settings: UserSettings,
    options?: { maxTokens?: number }
  ) => void
  updateScrollPosition: (scrollTop: number) => void
  updateContainerHeight: (height: number) => void

  // Element registration
  registerItem: (id: string, element: HTMLElement) => void
  unregisterItem: (id: string) => void

  // Data access
  getVisiblePossibilities: () => PossibilityResponse[]
  getLoadingStats: () => {
    visible: number
    loaded: number
    loading: number
    completed: number
    total: number
  }

  // Utilities
  scrollToTop: () => void
  scrollToItem: (index: number) => void
}

export function useVirtualizedPossibilities(
  options: UseVirtualizedPossibilitiesOptions = {}
): UseVirtualizedPossibilitiesReturn {
  const {
    itemHeight = 200,
    containerHeight = 600,
    bufferSize = 5,
    preloadDistance = '400px',
    maxConcurrentConnections = 6,
    enableVirtualScrolling = true,
    loadingStrategy = 'viewport',
  } = options

  // Virtual scroll state
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    scrollTop: 0,
    containerHeight,
    totalHeight: 0,
    visibleStartIndex: 0,
    visibleEndIndex: 0,
    bufferSize,
  })

  // Possibility pool for state management
  const possibilityPool = usePossibilityPool({
    maxConcurrentConnections,
  })

  // Lazy loading for viewport observation
  const lazyLoader = useLazyLoading({
    preloadDistance,
    onLoad: (id: string) => {
      // Queue possibility for loading when it enters the preload zone
      possibilityPool.queuePossibility(id, 'medium')
    },
  })

  // Refs for container and scroll management
  const containerRef = useRef<HTMLElement | null>(null)
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const metadataRef = useRef<PossibilityMetadata[]>([])

  // Calculate virtual items based on current state
  const virtualItems = useMemo<VirtualizedItem[]>(() => {
    const items: VirtualizedItem[] = []
    const { totalHeight, visibleStartIndex, visibleEndIndex } = virtualState

    if (!enableVirtualScrolling) {
      // Show all items without virtualization
      return metadataRef.current.map((metadata, index) => ({
        id: metadata.id,
        index,
        isVisible: true,
        isLoaded: lazyLoader.isLoaded(metadata.id),
        top: index * itemHeight,
        height: itemHeight,
        metadata,
      }))
    }

    // Show only visible items + buffer for virtual scrolling
    const startIndex = Math.max(0, visibleStartIndex - bufferSize)
    const endIndex = Math.min(
      metadataRef.current.length - 1,
      visibleEndIndex + bufferSize
    )

    for (let index = startIndex; index <= endIndex; index++) {
      const metadata = metadataRef.current[index]
      if (metadata) {
        items.push({
          id: metadata.id,
          index,
          isVisible: index >= visibleStartIndex && index <= visibleEndIndex,
          isLoaded: lazyLoader.isLoaded(metadata.id),
          top: index * itemHeight,
          height: itemHeight,
          metadata,
        })
      }
    }

    return items
  }, [virtualState, enableVirtualScrolling, itemHeight, bufferSize, lazyLoader])

  // Calculate visible range based on scroll position
  const calculateVisibleRange = useCallback(
    (scrollTop: number, containerHeight: number) => {
      if (!enableVirtualScrolling || metadataRef.current.length === 0) {
        return {
          visibleStartIndex: 0,
          visibleEndIndex: metadataRef.current.length - 1,
          totalHeight: metadataRef.current.length * itemHeight,
        }
      }

      const visibleStartIndex = Math.floor(scrollTop / itemHeight)
      const visibleEndIndex = Math.min(
        metadataRef.current.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight)
      )
      const totalHeight = metadataRef.current.length * itemHeight

      return {
        visibleStartIndex,
        visibleEndIndex,
        totalHeight,
      }
    },
    [enableVirtualScrolling, itemHeight]
  )

  // Initialize with messages and settings
  const initialize = useCallback(
    (
      messages: ChatMessage[],
      settings: UserSettings,
      options: { maxTokens?: number } = {}
    ) => {
      // Initialize possibility pool
      possibilityPool.initializePool(messages, settings, options)

      // Store metadata for virtual scrolling
      metadataRef.current = Array.from(possibilityPool.poolState.items.values())
        .map((item) => item.metadata)
        .sort((a, b) => a.order - b.order)

      // Calculate initial virtual state
      const range = calculateVisibleRange(0, virtualState.containerHeight)
      setVirtualState((prev) => ({
        ...prev,
        scrollTop: 0,
        totalHeight: range.totalHeight,
        visibleStartIndex: range.visibleStartIndex,
        visibleEndIndex: range.visibleEndIndex,
      }))

      // Load initial visible items based on strategy
      if (loadingStrategy === 'progressive') {
        // Start loading all high priority items
        metadataRef.current
          .filter((meta) => meta.priority === 'high')
          .forEach((meta) => possibilityPool.queuePossibility(meta.id, 'high'))
      }
    },
    [
      possibilityPool,
      calculateVisibleRange,
      virtualState.containerHeight,
      loadingStrategy,
    ]
  )

  // Update scroll position and recalculate visible items
  const updateScrollPosition = useCallback(
    (scrollTop: number) => {
      const range = calculateVisibleRange(
        scrollTop,
        virtualState.containerHeight
      )

      setVirtualState((prev) => ({
        ...prev,
        scrollTop,
        visibleStartIndex: range.visibleStartIndex,
        visibleEndIndex: range.visibleEndIndex,
        totalHeight: range.totalHeight,
      }))
    },
    [calculateVisibleRange, virtualState.containerHeight]
  )

  // Update container height
  const updateContainerHeight = useCallback(
    (height: number) => {
      const range = calculateVisibleRange(virtualState.scrollTop, height)

      setVirtualState((prev) => ({
        ...prev,
        containerHeight: height,
        visibleStartIndex: range.visibleStartIndex,
        visibleEndIndex: range.visibleEndIndex,
        totalHeight: range.totalHeight,
      }))
    },
    [calculateVisibleRange, virtualState.scrollTop]
  )

  // Register item element for lazy loading
  const registerItem = useCallback(
    (id: string, element: HTMLElement) => {
      itemElementsRef.current.set(id, element)
      lazyLoader.loadElement(id, element)
    },
    [lazyLoader]
  )

  // Unregister item element
  const unregisterItem = useCallback(
    (id: string) => {
      itemElementsRef.current.delete(id)
      lazyLoader.unloadElement(id)
    },
    [lazyLoader]
  )

  // Get visible possibilities (completed ones)
  const getVisiblePossibilities = useCallback((): PossibilityResponse[] => {
    const visibleIds = new Set(virtualItems.map((item) => item.id))
    return possibilityPool
      .getCompletedPossibilities()
      .filter((possibility) => visibleIds.has(possibility.id))
  }, [virtualItems, possibilityPool])

  // Get loading statistics
  const getLoadingStats = useCallback(() => {
    const poolStats = possibilityPool.getLoadingStats()
    const visibleCount = virtualItems.filter((item) => item.isVisible).length
    const loadedCount = virtualItems.filter((item) => item.isLoaded).length

    return {
      visible: visibleCount,
      loaded: loadedCount,
      loading: poolStats.loading,
      completed: poolStats.completed,
      total: poolStats.total,
    }
  }, [virtualItems, possibilityPool])

  // Scroll utilities
  const scrollToTop = useCallback(() => {
    updateScrollPosition(0)
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [updateScrollPosition])

  const scrollToItem = useCallback(
    (index: number) => {
      const scrollTop = index * itemHeight
      updateScrollPosition(scrollTop)
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollTop
      }
    },
    [updateScrollPosition, itemHeight]
  )

  // Auto-load visible items when strategy is 'viewport'
  useEffect(() => {
    if (loadingStrategy === 'viewport') {
      virtualItems
        .filter((item) => item.isVisible && !item.isLoaded)
        .forEach((item) => {
          possibilityPool.queuePossibility(item.id, 'medium')
        })
    }
  }, [virtualItems, loadingStrategy, possibilityPool])

  // Progressive loading for background items
  useEffect(() => {
    if (loadingStrategy === 'progressive') {
      const stats = possibilityPool.getLoadingStats()
      const hasCapacity = stats.loading < maxConcurrentConnections

      if (hasCapacity) {
        // Find next unloaded medium priority item
        const nextItem = metadataRef.current.find(
          (meta) =>
            meta.priority === 'medium' &&
            possibilityPool.getPossibilityStatus(meta.id) === 'pending'
        )

        if (nextItem) {
          possibilityPool.queuePossibility(nextItem.id, 'medium')
        } else {
          // Then load low priority items
          const nextLowItem = metadataRef.current.find(
            (meta) =>
              meta.priority === 'low' &&
              possibilityPool.getPossibilityStatus(meta.id) === 'pending'
          )

          if (nextLowItem) {
            possibilityPool.queuePossibility(nextLowItem.id, 'low')
          }
        }
      }
    }
  }, [
    possibilityPool.poolState,
    loadingStrategy,
    maxConcurrentConnections,
    possibilityPool,
  ])

  return {
    virtualState,
    virtualItems,
    possibilityPool,
    initialize,
    updateScrollPosition,
    updateContainerHeight,
    registerItem,
    unregisterItem,
    getVisiblePossibilities,
    getLoadingStats,
    scrollToTop,
    scrollToItem,
  }
}
