'use client'
import React from 'react'
import Image from 'next/image'
import type { ModelInfo } from '@/types/ai'
import { getProviderLogo } from '@/utils/providerLogos'

interface ModelToggleProps {
  model: ModelInfo
  enabled: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}

const ModelToggle: React.FC<ModelToggleProps> = ({
  model,
  enabled,
  onToggle,
  disabled,
}) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(model.id)}
      disabled={disabled}
      className={`flex items-center justify-between p-3 border border-[#2a2a2a] rounded-lg w-full transition-colors ${enabled ? 'bg-[#667eea]/10' : 'bg-[#0a0a0a]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a2a2a]'}`}
    >
      <div className="flex items-center gap-3">
        <Image
          src={getProviderLogo(model.provider, 'light')}
          alt={model.name}
          width={20}
          height={20}
          className="w-5 h-5 rounded"
        />
        <div className="text-sm text-[#e0e0e0]">{model.name}</div>
      </div>
      <div
        className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#667eea]' : 'bg-[#2a2a2a]'}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-[#0a0a0a] rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </div>
    </button>
  )
}

export default ModelToggle
