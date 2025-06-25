import React from 'react'
import type { Message } from '../types/chat'
import type { UserSettings } from '../types/settings'
import VirtualizedPossibilitiesPanel from './VirtualizedPossibilitiesPanel'
import { useSettings } from '../hooks/useSettings'

interface PossibilitiesPanelAdapterProps {
  message: Message
  onSelectPossibility?: (possibility: Message) => void
  onContinuePossibility?: (possibility: Message) => void
  useIndependentStreaming?: boolean
}

/**
 * Adapter component that bridges the old bulk possibilities system
 * with the new independent streaming system.
 */
const PossibilitiesPanelAdapter: React.FC<PossibilitiesPanelAdapterProps> = ({
  message,
  onSelectPossibility,
  onContinuePossibility,
  useIndependentStreaming = false,
}) => {
  const { settings } = useSettings()

  // Feature flag for gradual rollout
  if (useIndependentStreaming && settings) {
    // Convert Message to ChatMessage array for new system
    const messages = [message].map((msg) => ({
      ...msg,
      role: msg.role as 'user' | 'assistant',
    }))

    // Convert Message selection callback to PossibilityResponse callback
    const handleSelectResponse = (response: any) => {
      // Convert PossibilityResponse back to Message format for compatibility
      const messageResponse: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        model: response.model,
        temperature: response.temperature,
        probability: response.probability,
        timestamp: response.timestamp || new Date(),
        systemInstruction: response.systemInstruction,
        isPossibility: true,
      }
      onSelectPossibility?.(messageResponse)
    }

    return (
      <VirtualizedPossibilitiesPanel
        messages={messages}
        settings={settings}
        isActive={true}
        onSelectResponse={handleSelectResponse}
        enableVirtualScrolling={true}
        maxTokens={100}
      />
    )
  }

  // Fallback to existing inline possibilities display
  if (!message.possibilities || message.possibilities.length === 0) {
    return null
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-[#3a3a4a] scrollbar-track-[#1a1a1a]">
      {message.possibilities.map((possibility) => (
        <div
          key={possibility.id}
          onClick={() => {
            if (possibility.content) {
              onSelectPossibility?.(possibility)
            }
          }}
          className={`px-3 py-2 bg-[#1a1a1a] hover:bg-[#1a1a2a] rounded-lg transition-all border border-[#2a2a2a] hover:border-[#667eea] cursor-pointer ${
            possibility.content === '' ? 'animate-pulse' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 text-sm text-[#e0e0e0] word-wrap break-word overflow-wrap break-word line-clamp-2">
              {possibility.content || (
                <span className="text-[#666] italic">
                  Generating response...
                </span>
              )}
              {possibility.content && possibility.content.length > 0 && (
                <span className="inline-block w-1 h-4 bg-[#667eea] ml-1 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 text-xs text-[#888] min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-medium truncate">
                  {possibility.model || 'unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[#ffa726] font-medium min-w-[44px]"
                  title="Temperature"
                >
                  T:{possibility.temperature?.toFixed(1) || 'unk'}
                </span>
                <span
                  className="text-[#667eea] font-medium min-w-[44px]"
                  title="Probability Score"
                >
                  {possibility.probability !== undefined &&
                  possibility.probability !== null
                    ? `P:${Math.round(possibility.probability * 100)}%`
                    : 'P:unk'}
                </span>
                <span
                  className="text-[#a78bfa] font-medium min-w-[60px] truncate"
                  title="System Instruction"
                >
                  {possibility.systemInstruction || 'default'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PossibilitiesPanelAdapter
