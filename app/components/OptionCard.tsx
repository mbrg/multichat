import React from 'react'
import Image from 'next/image'
import type { ResponseOption } from '../types'
import { getProviderLogo } from '../utils/providerLogos'

interface OptionCardProps {
  response: ResponseOption & { systemInstruction?: { name: string } }
  onSelect?: (response: ResponseOption) => void
}

const OptionCard: React.FC<OptionCardProps> = ({ response, onSelect }) => {
  const probabilityPercentage = response.probability
    ? Math.round(response.probability * 100)
    : null

  const getModelIcon = () => {
    const logo = getProviderLogo(response.model.provider, 'light')
    return (
      <Image
        src={logo}
        alt={response.model.provider}
        width={16}
        height={16}
        className="w-full h-full object-contain"
      />
    )
  }

  const getDisplayModelName = (modelName: string): string => {
    // Trim Anthropic model names: claude-3-5-sonnet-20241022 -> c-3-5-sonnet
    if (modelName.includes('claude')) {
      return modelName
        .replace('claude-', 'c-')
        .replace(/-\d{8}$/, '') // Remove date suffix
        .replace(/-\d{6}$/, '') // Remove shorter date suffix
    }
    return modelName
  }

  const handleClick = () => {
    onSelect?.(response)
  }

  return (
    <div
      className="
        bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 cursor-pointer 
        transition-all duration-200 min-h-[60px] 
        hover:border-[#667eea] hover:bg-[#1a1a2a] hover:transform hover:translate-x-1
        active:scale-[0.98] 
      "
      onClick={handleClick}
    >
      <div
        className="grid grid-cols-[24px_1fr_auto] md:grid-cols-[24px_1fr_140px_auto] gap-3 items-start"
      >
        {/* Provider Logo */}
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 bg-white p-1 overflow-hidden mt-0.5">
          {getModelIcon()}
        </div>

        {/* Content Text */}
        <div className="text-sm leading-[1.5] text-[#e0e0e0] overflow-hidden">
          <div className="break-words md:max-h-[2.8em] overflow-hidden">
            {response.content.length > 120
              ? response.content.slice(0, 120) + '...'
              : response.content}
            {response.isStreaming && (
              <span className="inline-block ml-1 w-0.5 h-4 bg-[#667eea] animate-pulse"></span>
            )}
          </div>
        </div>

        {/* Model Name */}
        <div className="text-xs text-[#888] font-medium flex-shrink-0 mt-0.5 hidden md:block">
          {getDisplayModelName(response.model.name)}
        </div>

        {/* Tags (Temperature, System Instructions, Probability) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="md:hidden text-xs text-[#888] font-medium">
            {getDisplayModelName(response.model.name)}
          </span>
          {response.temperature !== undefined && (
            <div
              className="bg-[#2a2a3a] px-2 py-1 rounded text-[#ffa726] font-bold text-xs"
              title="Temperature"
            >
              T:{response.temperature?.toFixed(1)}
            </div>
          )}
          {response.systemInstruction && (
            <div
              className="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-xs"
              title={`System: ${response.systemInstruction.name}`}
            >
              {response.systemInstruction.name}
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
    </div>
  )
}

export default OptionCard
