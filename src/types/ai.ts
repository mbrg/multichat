export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  data: string // base64 encoded
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  description: string
  supportsLogprobs: boolean
  maxTokens: number
  supportedMimeTypes?: string[]
}

export interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  stream?: boolean
}

export interface ResponseWithLogprobs {
  content: string
  logprobs?: any[] // AI SDK LogProbs type structure
  probability: number | null // null when probability calculation unavailable
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ResponseOption {
  id: string
  model: ModelInfo
  content: string
  probability: number | null // null when probability calculation unavailable
  logprobs?: any[] // AI SDK LogProbs type structure
  isStreaming: boolean
  temperature?: number
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProvider {
  name: string
  models: ModelInfo[]
  generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs>
  validateApiKey(): Promise<boolean>
}

export interface ModelConfig {
  provider: string
  model: string
  apiKey: string
  enabled: boolean
  defaultOptions?: GenerationOptions
}

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'together'

export interface ProviderConfig {
  [key: string]: {
    apiKey?: string
    enabled: boolean
    models: string[]
  }
}
