import type { ModelInfo, ProviderType } from '../../types/ai'
import { SUPPORTED_MIME_COMBINATIONS } from '../../constants/defaults'

// Token configuration for different model types
export const TOKEN_LIMITS = {
  POSSIBILITY_DEFAULT: 100, // Default tokens for possibility generation
  POSSIBILITY_REASONING: 1500, // Tokens for reasoning models in possibilities
  CONTINUATION_DEFAULT: 1000, // Additional tokens when continuing from a possibility
} as const

export const MODEL_CONFIGS: Record<ProviderType, ModelInfo[]> = {
  openai: [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      alias: 'gpt-4',
      provider: 'openai',
      description: 'Most capable GPT-4 model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'medium',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      alias: 'gpt-4-turbo',
      provider: 'openai',
      description: 'Faster and cheaper GPT-4',
      supportsLogprobs: true,
      maxTokens: 128000,
      priority: 'medium',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      alias: 'gpt-4o',
      provider: 'openai',
      description: 'Multimodal flagship model',
      supportsLogprobs: true,
      maxTokens: 128000,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'audio/wav',
        'audio/mp3',
      ],
    },
    {
      id: 'o1-preview',
      name: 'o1-preview',
      alias: 'o1-preview',
      provider: 'openai',
      description: 'Advanced reasoning model',
      supportsLogprobs: false,
      maxTokens: 32768,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
      isReasoningModel: true,
    },
    {
      id: 'o1-mini',
      name: 'o1-mini',
      alias: 'o1-mini',
      provider: 'openai',
      description: 'Faster reasoning model',
      supportsLogprobs: false,
      maxTokens: 65536,
      priority: 'medium',
      supportedMimeTypes: ['text/plain'],
      isReasoningModel: true,
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      alias: 'c-3.5-sonnet',
      provider: 'anthropic',
      description: 'Most intelligent Claude model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      alias: 'c-3.5-haiku',
      provider: 'anthropic',
      description: 'Fast and efficient Claude model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      alias: 'c-3-opus',
      provider: 'anthropic',
      description: 'Highly capable Claude model',
      supportsLogprobs: false,
      maxTokens: 4096,
      priority: 'medium',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
  ],
  google: [
    {
      id: 'gemini-2.5-pro-preview-05-06',
      name: 'Gemini 2.5 Pro',
      alias: 'gemini-2.5-pro',
      provider: 'google',
      description: 'Most advanced Gemini Pro model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      isReasoningModel: true,
    },
    {
      id: 'gemini-2.5-flash-preview-04-17',
      name: 'Gemini 2.5 Flash',
      alias: 'gemini-2.5-flash',
      provider: 'google',
      description: 'Most advanced Gemini Flash model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      isReasoningModel: true,
    },
    {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      alias: 'gemini-2.0-flash',
      provider: 'google',
      description: 'Latest Gemini model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      alias: 'gemini-1.5-pro',
      provider: 'google',
      description: 'Advanced Gemini model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'medium',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
      isReasoningModel: true,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      alias: 'gemini-1.5-flash',
      provider: 'google',
      description: 'Fast Gemini model',
      supportsLogprobs: false,
      maxTokens: 8192,
      priority: 'medium',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
  ],
  mistral: [
    {
      id: 'mistral-large-latest',
      name: 'Mistral Large',
      alias: 'mistral-large',
      provider: 'mistral',
      description: 'Most capable Mistral model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'medium',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'mistral-small-latest',
      name: 'Mistral Small',
      alias: 'mistral-small',
      provider: 'mistral',
      description: 'Efficient Mistral model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'low',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'pixtral-12b-2409',
      name: 'Pixtral 12B',
      alias: 'pixtral-12b',
      provider: 'mistral',
      description: 'Multimodal Mistral model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'low',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
  ],
  together: [
    {
      id: 'deepseek-ai/DeepSeek-R1',
      name: 'DeepSeek-R1',
      alias: 'deepseek-r1',
      provider: 'together',
      description:
        'Advanced reasoning model trained with reinforcement learning',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
      isReasoningModel: true,
    },
    {
      id: 'deepseek-ai/DeepSeek-V3',
      name: 'DeepSeek-V3',
      alias: 'deepseek-v3',
      provider: 'together',
      description:
        'Mixture-of-Experts model challenging top AI models at lower cost',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'google/gemma-2-27b-it',
      name: 'Gemma 3 27B',
      alias: 'gemma-3-27b',
      provider: 'together',
      description: 'Lightweight multimodal model with vision-language support',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: [
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ],
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      name: 'Llama 3.1 8B',
      alias: 'llama-3.1-8b',
      provider: 'together',
      description: 'Efficient Llama model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'low',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      name: 'Llama 3.1 70B',
      alias: 'llama-3.1-70b',
      provider: 'together',
      description: 'Large Llama model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'medium',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      name: 'Llama 3.3 70B',
      alias: 'llama-3.3-70b',
      provider: 'together',
      description: 'Latest multilingual Llama model optimized for dialogue',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
      name: 'Qwen 2.5 72B',
      alias: 'qwen-2.5-72b',
      provider: 'together',
      description: 'Advanced Qwen model',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'low',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
      name: 'Qwen 2.5 Coder 32B',
      alias: 'qwen-2.5-coder-32b',
      provider: 'together',
      description: 'Specialized coding model for development tasks',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
    },
    {
      id: 'Qwen/QwQ-32B-Preview',
      name: 'Qwen3 27B',
      alias: 'qwen3-27b',
      provider: 'together',
      description: 'Qwen series reasoning model excelling in complex tasks',
      supportsLogprobs: true,
      maxTokens: 8192,
      priority: 'high',
      supportedMimeTypes: ['text/plain'],
      isReasoningModel: true,
    },
  ],
}

export const getAllModels = (): ModelInfo[] => {
  return Object.values(MODEL_CONFIGS).flat()
}

export const getModelsByProvider = (provider: ProviderType): ModelInfo[] => {
  return MODEL_CONFIGS[provider] || []
}

export const getModelById = (id: string): ModelInfo | undefined => {
  return getAllModels().find((model) => model.id === id)
}

export const getPopularModels = (): ModelInfo[] => {
  return getAllModels().filter((model) => model.priority === 'high')
}

export const isPopularModel = (modelId: string): boolean => {
  const model = getModelById(modelId)
  return model?.priority === 'high' || false
}

export const getDefaultTemperatureRange = (count: number): number[] => {
  if (count === 1) return [0.7]
  if (count === 2) return [0.7, 0.9]
  if (count === 3) return [0.7, 0.8, 0.9]
  if (count === 4) return [0.7, 0.8, 0.9, 1.0]
  if (count === 5) return [0.7, 0.75, 0.8, 0.9, 1.0]

  // For more than 5, generate evenly spaced temperatures
  const temperatures: number[] = []
  for (let i = 0; i < count; i++) {
    temperatures.push(0.7 + (0.3 * i) / (count - 1))
  }
  return temperatures
}

export const isReasoningModel = (modelId: string): boolean => {
  const model = getModelById(modelId)
  return model?.isReasoningModel === true
}

export const getDefaultTokenLimit = (
  modelId: string,
  settings?: { possibilityTokens?: number; reasoningTokens?: number }
): number => {
  if (isReasoningModel(modelId)) {
    return settings?.reasoningTokens ?? TOKEN_LIMITS.POSSIBILITY_REASONING
  }
  return settings?.possibilityTokens ?? TOKEN_LIMITS.POSSIBILITY_DEFAULT
}
