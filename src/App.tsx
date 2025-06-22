import { useState, useEffect, useRef, useCallback } from 'react'
import { usePossibilities, generateVariationsForModel } from './hooks'
import { PossibilitiesPanel } from './components'
import type { ModelInfo, ResponseOption } from './types'
import openaiLogo from './assets/OpenAI-black-monoblossom.svg'
import './App.css'

const mockModels: ModelInfo[] = [
  { 
    id: 'gpt-4', 
    name: 'GPT-4o', 
    provider: 'openai', 
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40ODUgMiAyIDYuNDg1IDIgMTJTNi40ODUgMjIgMTIgMjJTMjIgMTcuNTE1IDIyIDEyUzE3LjUxNSAyIDEyIDJaTTEyIDIwQzcuNTg5IDIwIDQgMTYuNDExIDQgMTJTNy41ODkgNCA12IDRTMjAgNy41ODkgMjAgMTJTMTYuNDExIDIwIDEyIDIwWiIgZmlsbD0iIzAwQTY3RCIvPgo8L3N2Zz4K',
    maxTokens: 8192, 
    supportsLogprobs: true 
  },
  { 
    id: 'claude-3-sonnet', 
    name: 'Claude 3.5 Sonnet', 
    provider: 'anthropic', 
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY2NjAwIi8+Cjwvc3ZnPgo=',
    maxTokens: 4096, 
    supportsLogprobs: false 
  },
  { 
    id: 'gemini-pro', 
    name: 'Gemini 1.5 Pro', 
    provider: 'google', 
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTAuNSA2TDYgNy41TDEwLjUgOUwxMiAxM0wxMy41IDlMMTggNy41TDEzLjUgNkwxMiAyWiIgZmlsbD0iIzQyODVGNCIvPgo8cGF0aCBkPSJNMTIgMTRMMTAuNSAxOEw2IDE5LjVMMTAuNSAyMUwxMiAyNUwxMy41IDIxTDE4IDE5LjVMMTMuNSAxOEwxMiAxNFoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+Cg==',
    maxTokens: 2048, 
    supportsLogprobs: true 
  },
  { 
    id: 'mistral-large', 
    name: 'Mistral Large', 
    provider: 'mistral', 
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTcgN0wxMiAxMkw3IDdMMTIgMloiIGZpbGw9IiNGRjcwMDAiLz4KPHA0aCBkPSJNMTIgMTJMMTcgMTdMMTIgMjJMNyAxN0wxMiAxMloiIGZpbGw9IiNGRjcwMDAiLz4KPHA4aCBkPSJNNCA5TDkgMTRMNCAyMEwxNSA5TDkgM0w0IDlaIiBmaWxsPSIjRkY3MDAwIi8+Cjwvc3ZnPgo=',
    maxTokens: 8192, 
    supportsLogprobs: true 
  },
  { 
    id: 'llama-3-70b', 
    name: 'LLaMA 3.1 405B', 
    provider: 'together', 
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuNjUgMTAuMzVMMjIgMTJMMTMuNjUgMTMuNjVMMTIgMjJMMTAuMzUgMTMuNjVMMiAxMkwxMC4zNSAxMC4zNUwxMiAyWiIgZmlsbD0iI0ZGQkEwMCIvPgo8L3N2Zz4K',
    maxTokens: 4096, 
    supportsLogprobs: true 
  }
]

const sampleResponses = [
  "The future of artificial intelligence lies in creating systems that can reason, learn, and adapt like humans while maintaining the efficiency and precision of machines.",
  "AI will revolutionize every industry by automating complex tasks, providing personalized experiences, and enabling new forms of human-computer collaboration.",
  "The key to advancing AI is developing better understanding of consciousness, creativity, and ethical decision-making in artificial systems.",
  "Machine learning models will become more interpretable and trustworthy as we develop better techniques for explaining their reasoning processes.",
  "The convergence of AI with other technologies like quantum computing, robotics, and biotechnology will create unprecedented opportunities for innovation."
]

function App() {
  const possibilities = usePossibilities({ maxResponses: 1000 })
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationRound, setGenerationRound] = useState(0)
  const [selectedResponse, setSelectedResponse] = useState<ResponseOption | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const generateInitialResponses = (input: string) => {
    if (!input.trim()) {
      possibilities.clearResponses()
      setGenerationRound(0)
      return
    }

    setIsGenerating(true)
    possibilities.setLoading(true)
    possibilities.clearResponses()
    
    setTimeout(() => {
      const allVariations: any[] = []
      let currentProbability = 0.95
      
      // Generate initial variations per model with decreasing probability
      mockModels.forEach((model, modelIndex) => {
        // Each model gets 2-3 initial variations
        const variationCount = modelIndex < 2 ? 3 : 2
        const baseContent = sampleResponses[Math.floor(Math.random() * sampleResponses.length)]
        const variations = generateVariationsForModel(
          model,
          baseContent,
          input,
          variationCount,
          currentProbability
        )
        allVariations.push(...variations)
        currentProbability = Math.max(0.1, currentProbability - 0.1)
      })
      
      // Sort by probability descending
      allVariations.sort((a, b) => b.probability - a.probability)
      
      possibilities.addResponses(allVariations)
      possibilities.setLoading(false)
      setIsGenerating(false)
      setGenerationRound(1)
    }, 800)
  }

  const generateMoreResponses = useCallback(() => {
    if (!inputValue.trim() || isGenerating) return

    setIsGenerating(true)
    
    setTimeout(() => {
      const allVariations: any[] = []
      // Start with lower probability for subsequent rounds
      let currentProbability = Math.max(0.05, 0.8 - (generationRound * 0.2))
      
      mockModels.forEach((model) => {
        // Generate multiple base contents for variety
        for (let i = 0; i < 2; i++) {
          const baseContent = sampleResponses[Math.floor(Math.random() * sampleResponses.length)]
          const variations = generateVariationsForModel(
            model,
            baseContent,
            inputValue,
            2, // 2 variations per base content
            currentProbability - (i * 0.1)
          )
          allVariations.push(...variations)
        }
        currentProbability = Math.max(0.05, currentProbability - 0.15)
      })
      
      // Sort by probability descending
      allVariations.sort((a, b) => b.probability - a.probability)
      
      possibilities.addResponses(allVariations)
      setIsGenerating(false)
      setGenerationRound(prev => prev + 1)
    }, 600)
  }, [inputValue, isGenerating, generationRound, possibilities])

  // Debounced input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      generateInitialResponses(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setSelectedResponse(null) // Clear selection when input changes
  }

  const handleSelectResponse = (response: ResponseOption) => {
    setSelectedResponse(response)
    console.log('Selected response:', response)
  }


  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }} 
         className="h-screen bg-[#0a0a0a] text-gray-200 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-[#1a1a1a] border-b border-[#2a2a2a] min-h-[56px]">
        <div className="text-lg font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Infinite Possibilities Chat
        </div>
        <button className="px-3 py-2 text-xs border border-[#3a3a3a] text-[#888] rounded hover:border-[#667eea] hover:text-gray-200 transition-colors whitespace-nowrap">
          Settings
        </button>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {/* User Message */}
          {inputValue.trim() && (
            <div className="flex gap-3 max-w-[800px] w-full self-center">
              <div className="w-8 h-8 bg-[#4a5568] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                U
              </div>
              <div className="flex-1 bg-[#2a2a3a] border border-[#3a3a4a] rounded-xl p-4">
                {inputValue}
              </div>
            </div>
          )}

          {/* Selected Response */}
          {selectedResponse && (
            <div className="max-w-[800px] w-full self-center">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white p-1">
                  <img 
                    src={openaiLogo} 
                    alt="OpenAI"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 relative">
                  <div className="absolute -top-2 right-4 bg-[#2a2a3a] px-2 py-1 rounded text-[#667eea] text-xs font-bold border border-[#3a3a4a] flex items-center gap-2">
                    <span className="text-[#888]">{selectedResponse.model.name}</span>
                    <span>{Math.round(selectedResponse.probability * 100)}%</span>
                  </div>
                  <div className="text-sm leading-relaxed text-[#e0e0e0]">
                    {selectedResponse.content}
                  </div>
                </div>
              </div>
            </div>
          )}


          <div ref={messagesEndRef} />
        </div>

        {/* Possibilities Panel */}
        <PossibilitiesPanel
          responses={possibilities.responses}
          isLoading={isGenerating}
          onLoadMore={() => {
            // First try to load more from existing responses
            if (possibilities.hasMore) {
              possibilities.loadMore()
            } else if (!isGenerating && inputValue.trim()) {
              // If no more cached responses, generate new ones
              generateMoreResponses()
            }
          }}
          hasMore={possibilities.hasMore || (!isGenerating && inputValue.trim().length > 0)}
          isActive={inputValue.trim().length > 0}
          onSelectResponse={handleSelectResponse}
        />

        {/* Input Area */}
        <div className="p-3 bg-[#1a1a1a] border-t border-[#2a2a2a] relative z-10">
          <div className="max-w-[800px] mx-auto relative">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Start typing to see possibilities..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-gray-200 placeholder-[#666] focus:outline-none focus:border-[#667eea] text-sm"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
