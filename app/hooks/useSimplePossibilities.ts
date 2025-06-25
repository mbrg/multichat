import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ChatMessage } from '../types/api'
import { UserSettings } from '../types/settings'
import { PossibilityMetadataService, PossibilityMetadata } from '../services/ai/PossibilityMetadataService'

interface PossibilityState {
  id: string
  content: string
  isComplete: boolean
  metadata: PossibilityMetadata
  probability: number | null
}

export function useSimplePossibilities(messages: ChatMessage[], settings: UserSettings) {
  // Generate metadata once - never changes during a session
  const metadata = useMemo(() => {
    const service = new PossibilityMetadataService()
    return service.generatePrioritizedMetadata(settings)
  }, [settings])
  
  // Simple state - no complex maps or sets
  const [possibilities, setPossibilities] = useState<PossibilityState[]>([])
  
  // Simple loading state
  const [isLoading, setIsLoading] = useState(false)
  
  // Track loading states to prevent duplicates
  const loadingRef = useRef<Set<string>>(new Set())
  
  // Clear state when settings change
  useEffect(() => {
    setPossibilities([])
    loadingRef.current.clear()
  }, [settings])
  
  const loadPossibility = useCallback(async (possibilityId: string) => {
    const meta = metadata.find((m: PossibilityMetadata) => m.id === possibilityId)
    if (!meta) return
    
    // Check if already loading or loaded to prevent duplicates
    if (loadingRef.current.has(possibilityId)) return
    
    // Mark as loading immediately
    loadingRef.current.add(possibilityId)
    
    // Add to state immediately - user sees it right away
    setPossibilities(prev => [...prev, {
      id: possibilityId,
      content: '',
      isComplete: false,
      metadata: meta,
      probability: null
    }])
    
    try {
      setIsLoading(true)
      
      // Use existing API - it already works
      const response = await fetch(`/api/possibility/${possibilityId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, permutation: meta })
      })
      
      if (!response.body) throw new Error('No response body')
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const text = decoder.decode(value)
        const lines = text.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const event = JSON.parse(line.slice(6))
            
            if (event.type === 'token') {
              // Update content immediately - char by char
              setPossibilities(prev => prev.map(p => 
                p.id === possibilityId 
                  ? { ...p, content: p.content + event.data.token }
                  : p
              ))
            } else if (event.type === 'probability') {
              // Update probability when received
              setPossibilities(prev => prev.map(p => 
                p.id === possibilityId 
                  ? { ...p, probability: event.data.probability }
                  : p
              ))
            }
          }
        }
      }
      
      // Mark complete and keep in loading set (don't show as available)
      setPossibilities(prev => prev.map(p => 
        p.id === possibilityId 
          ? { ...p, isComplete: true }
          : p
      ))
      
    } catch (error) {
      console.error(`Error loading possibility ${possibilityId}:`, error)
      // Remove from loading set on error
      loadingRef.current.delete(possibilityId)
      // Remove from possibilities on error
      setPossibilities(prev => prev.filter(p => p.id !== possibilityId))
    } finally {
      setIsLoading(false)
    }
  }, [messages, metadata])
  
  return {
    possibilities,
    availableMetadata: metadata.filter((m: PossibilityMetadata) => 
      !possibilities.find(p => p.id === m.id) && !loadingRef.current.has(m.id)
    ),
    loadPossibility,
    isLoading
  }
}