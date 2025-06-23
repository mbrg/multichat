import React from 'react'
import Image from 'next/image'
import type { ResponseOption } from '../types'
import openaiLogo from '../assets/OpenAI-black-monoblossom.svg'

interface OptionCardProps {
  response: ResponseOption
  onSelect?: (response: ResponseOption) => void
}

const OptionCard: React.FC<OptionCardProps> = ({ response, onSelect }) => {
  const probabilityPercentage = response.probability
    ? Math.round(response.probability * 100)
    : null

  const getModelIcon = () => {
    return (
      <Image
        src={openaiLogo}
        alt="OpenAI"
        width={16}
        height={16}
        className="w-full h-full object-contain"
      />
    )
  }

  const handleClick = () => {
    onSelect?.(response)
  }

  return (
    <div
      className="
        bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 cursor-pointer 
        transition-all duration-200 flex items-center gap-3 min-h-[50px] 
        hover:border-[#667eea] hover:bg-[#1a1a2a] hover:transform hover:translate-x-1
        active:scale-[0.98] 
      "
      onClick={handleClick}
    >
      {/* Model Info */}
      <div className="flex items-center gap-2 min-w-[160px] flex-shrink-0">
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0 bg-white p-1 overflow-hidden">
          {getModelIcon()}
        </div>
        <span className="text-xs text-[#888] font-medium">
          {response.model.name}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 text-sm leading-[1.5] text-[#e0e0e0] overflow-hidden">
        <div className="break-words max-h-[2.8em] overflow-hidden">
          {response.content.length > 120
            ? response.content.slice(0, 120) + '...'
            : response.content}
          {response.isStreaming && (
            <span className="inline-block ml-1 w-0.5 h-4 bg-[#667eea] animate-pulse"></span>
          )}
        </div>
      </div>

      {/* Temperature and Probability */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {response.temperature !== undefined && (
          <div
            className="bg-[#2a2a3a] px-2 py-1 rounded text-[#ffa726] font-bold text-xs"
            title="Temperature"
          >
            T:{response.temperature?.toFixed(1)}
          </div>
        )}
        {probabilityPercentage && (
          <div
            className="bg-[#2a2a3a] px-2 py-1 rounded text-[#667eea] font-bold text-xs"
            title="Probability Score"
          >
            P:{probabilityPercentage}%
          </div>
        )}
      </div>
    </div>
  )
}

export default OptionCard
