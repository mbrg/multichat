import { useEffect, useRef, useCallback, useState } from 'react'

export interface ViewportObserverOptions {
  rootMargin?: string
  threshold?: number | number[]
  disabled?: boolean
}

export interface ViewportObserverCallbacks {
  onEnterViewport?: (id: string, entry: IntersectionObserverEntry) => void
  onExitViewport?: (id: string, entry: IntersectionObserverEntry) => void
  onVisibilityChange?: (
    id: string,
    isVisible: boolean,
    entry: IntersectionObserverEntry
  ) => void
}

export interface UseViewportObserverReturn {
  observeElement: (id: string, element: HTMLElement) => void
  unobserveElement: (id: string) => void
  isVisible: (id: string) => boolean
  getVisibleElements: () => string[]
  disconnect: () => void
}

export function useViewportObserver(
  callbacks: ViewportObserverCallbacks = {},
  options: ViewportObserverOptions = {}
): UseViewportObserverReturn {
  const {
    rootMargin = '200px',
    threshold = [0, 0.1, 0.5, 1.0],
    disabled = false,
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)
  const observedElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const visibilityStateRef = useRef<Map<string, boolean>>(new Map())
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())

  // Initialize observer
  useEffect(() => {
    if (disabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          const id = element.dataset.possibilityId

          if (!id) return

          const wasVisible = visibilityStateRef.current.get(id) || false
          const isVisible = entry.isIntersecting

          // Update visibility state
          visibilityStateRef.current.set(id, isVisible)

          // Update visible elements set
          setVisibleElements((prev) => {
            const newSet = new Set(prev)
            if (isVisible) {
              newSet.add(id)
            } else {
              newSet.delete(id)
            }
            return newSet
          })

          // Call visibility change callback
          if (callbacks.onVisibilityChange) {
            callbacks.onVisibilityChange(id, isVisible, entry)
          }

          // Call enter/exit callbacks
          if (isVisible && !wasVisible) {
            if (callbacks.onEnterViewport) {
              callbacks.onEnterViewport(id, entry)
            }
          } else if (!isVisible && wasVisible) {
            if (callbacks.onExitViewport) {
              callbacks.onExitViewport(id, entry)
            }
          }
        })
      },
      {
        rootMargin,
        threshold,
      }
    )

    observerRef.current = observer

    return () => {
      observer.disconnect()
    }
  }, [disabled, rootMargin, threshold, callbacks])

  // Observe element
  const observeElement = useCallback(
    (id: string, element: HTMLElement) => {
      if (disabled || !observerRef.current) return

      // Set data attribute for identification
      element.dataset.possibilityId = id

      // Store element reference
      observedElementsRef.current.set(id, element)

      // Start observing
      observerRef.current.observe(element)
    },
    [disabled]
  )

  // Unobserve element
  const unobserveElement = useCallback((id: string) => {
    if (!observerRef.current) return

    const element = observedElementsRef.current.get(id)
    if (element) {
      observerRef.current.unobserve(element)
      observedElementsRef.current.delete(id)
      visibilityStateRef.current.delete(id)

      setVisibleElements((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }, [])

  // Check if element is visible
  const isVisible = useCallback((id: string): boolean => {
    return visibilityStateRef.current.get(id) || false
  }, [])

  // Get all visible elements
  const getVisibleElements = useCallback((): string[] => {
    return Array.from(visibleElements)
  }, [visibleElements])

  // Disconnect observer
  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observedElementsRef.current.clear()
      visibilityStateRef.current.clear()
      setVisibleElements(new Set())
    }
  }, [])

  return {
    observeElement,
    unobserveElement,
    isVisible,
    getVisibleElements,
    disconnect,
  }
}

// Hook for simple viewport tracking with automatic cleanup
export function useViewportVisibility(
  elementRef: React.RefObject<HTMLElement>,
  id: string,
  options: ViewportObserverOptions & {
    onEnterViewport?: () => void
    onExitViewport?: () => void
  } = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false)

  const { onEnterViewport, onExitViewport, ...observerOptions } = options

  const observer = useViewportObserver(
    {
      onEnterViewport: (observedId) => {
        if (observedId === id) {
          setIsVisible(true)
          onEnterViewport?.()
        }
      },
      onExitViewport: (observedId) => {
        if (observedId === id) {
          setIsVisible(false)
          onExitViewport?.()
        }
      },
    },
    observerOptions
  )

  // Use a separate effect to handle element changes properly
  const [currentElement, setCurrentElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setCurrentElement(elementRef.current)
  }, [elementRef])

  useEffect(() => {
    if (currentElement && id) {
      observer.observeElement(id, currentElement)

      return () => {
        observer.unobserveElement(id)
      }
    }
  }, [currentElement, id, observer])

  return isVisible
}

// Hook for lazy loading with preload distance
export interface UseLazyLoadingOptions extends ViewportObserverOptions {
  preloadDistance?: string
  onLoad?: (id: string) => void
  onUnload?: (id: string) => void
}

export function useLazyLoading(
  options: UseLazyLoadingOptions = {}
): UseViewportObserverReturn & {
  loadElement: (id: string, element: HTMLElement) => void
  unloadElement: (id: string) => void
  isLoaded: (id: string) => boolean
  getLoadedElements: () => string[]
} {
  const {
    preloadDistance = '400px',
    onLoad,
    onUnload,
    ...observerOptions
  } = options

  const [loadedElements, setLoadedElements] = useState<Set<string>>(new Set())
  const loadedElementsRef = useRef<Set<string>>(new Set())

  const observer = useViewportObserver(
    {
      onEnterViewport: (id) => {
        if (!loadedElementsRef.current.has(id)) {
          loadedElementsRef.current.add(id)
          setLoadedElements(new Set(loadedElementsRef.current))
          onLoad?.(id)
        }
      },
      onExitViewport: (id) => {
        // Optionally unload elements that are far from viewport
        // For now, keep them loaded for better UX
      },
    },
    {
      ...observerOptions,
      rootMargin: preloadDistance,
    }
  )

  const loadElement = useCallback(
    (id: string, element: HTMLElement) => {
      observer.observeElement(id, element)
    },
    [observer]
  )

  const unloadElement = useCallback(
    (id: string) => {
      observer.unobserveElement(id)
      loadedElementsRef.current.delete(id)
      setLoadedElements(new Set(loadedElementsRef.current))
      onUnload?.(id)
    },
    [observer, onUnload]
  )

  const isLoaded = useCallback((id: string): boolean => {
    return loadedElementsRef.current.has(id)
  }, [])

  const getLoadedElements = useCallback((): string[] => {
    return Array.from(loadedElements)
  }, [loadedElements])

  return {
    ...observer,
    loadElement,
    unloadElement,
    isLoaded,
    getLoadedElements,
  }
}
