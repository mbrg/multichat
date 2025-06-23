import { useState, useCallback, useEffect } from 'react'
import type { ResponseOption, ModelInfo } from '../types'
import { compareProbabilities } from '../utils/logprobs'

interface UsePossibilitiesOptions {
  initialLoadCount?: number
  loadMoreCount?: number
  maxResponses?: number
}

interface UsePossibilitiesReturn {
  responses: ResponseOption[]
  isLoading: boolean
  hasMore: boolean
  addResponse: (response: ResponseOption) => void
  addResponses: (responses: ResponseOption[]) => void
  loadMore: () => void
  clearResponses: () => void
  setLoading: (loading: boolean) => void
}

export const usePossibilities = (
  options: UsePossibilitiesOptions = {}
): UsePossibilitiesReturn => {
  const {
    initialLoadCount = 10,
    loadMoreCount = 10,
    maxResponses = 100,
  } = options

  const [responses, setResponses] = useState<ResponseOption[]>([])
  const [displayedCount, setDisplayedCount] = useState(initialLoadCount)
  const [isLoading, setIsLoading] = useState(false)

  // Always sort by probability when displaying (null values go to end)
  const sortedResponses = [...responses].sort((a, b) => compareProbabilities(a.probability, b.probability))
  const displayedResponses = sortedResponses.slice(0, displayedCount)
  const hasMore =
    displayedCount < sortedResponses.length && displayedCount < maxResponses

  const addResponse = useCallback(
    (response: ResponseOption) => {
      setResponses((prev) => {
        const updated = [...prev, response]
        return updated.slice(0, maxResponses)
      })
    },
    [maxResponses]
  )

  const addResponses = useCallback(
    (newResponses: ResponseOption[]) => {
      setResponses((prev) => {
        const combined = [...prev, ...newResponses]
        const unique = combined.filter(
          (response, index, arr) =>
            arr.findIndex((r) => r.id === response.id) === index
        )
        return unique.slice(0, maxResponses)
      })
    },
    [maxResponses]
  )

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setDisplayedCount((prev) =>
        Math.min(prev + loadMoreCount, responses.length, maxResponses)
      )
    }
  }, [hasMore, isLoading, loadMoreCount, responses.length, maxResponses])

  const clearResponses = useCallback(() => {
    setResponses([])
    setDisplayedCount(initialLoadCount)
  }, [initialLoadCount])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  useEffect(() => {
    if (responses.length > 0 && displayedCount < initialLoadCount) {
      setDisplayedCount(Math.min(initialLoadCount, responses.length))
    }
  }, [responses.length, displayedCount, initialLoadCount])

  return {
    responses: displayedResponses,
    isLoading,
    hasMore,
    addResponse,
    addResponses,
    loadMore,
    clearResponses,
    setLoading,
  }
}

export const createMockResponse = (
  id: string,
  model: ModelInfo,
  content: string,
  probability: number = Math.random(),
  temperature: number = 0.7
): ResponseOption => ({
  id,
  model,
  content,
  probability,
  temperature,
  isStreaming: false,
  timestamp: new Date(),
  logprobs: Array.from({ length: content.split(' ').length }, () =>
    Math.log(probability)
  ),
})

export const generateVariationsForModel = (
  model: ModelInfo,
  baseContent: string,
  _userInput: string,
  variationCount: number,
  baseProbability: number
): ResponseOption[] => {
  const variations = []

  for (let i = 0; i < variationCount; i++) {
    // Decrease probability for each variation
    const probability = Math.max(
      0.05,
      baseProbability - i * 0.15 - Math.random() * 0.1
    )

    // Create slight variations in content
    const variationPhrases = [
      `${baseContent}`,
      `Here's another perspective: ${baseContent}`,
      `Alternatively, ${baseContent.toLowerCase()}`,
      `From a different angle: ${baseContent}`,
      `Consider this: ${baseContent}`,
      `One way to think about it: ${baseContent}`,
      `Building on that idea: ${baseContent}`,
      `Another approach would be: ${baseContent}`,
    ]

    const content = variationPhrases[i % variationPhrases.length]

    variations.push(
      createMockResponse(
        `${model.id}-var-${i}-${Date.now()}`,
        model,
        content,
        probability,
        0.1 + Math.random() * 0.9 // Random temperature between 0.1 and 1.0
      )
    )
  }

  return variations
}
