export interface ModelInfo {
  id: string
  name: string
  provider: string
  icon: string
  maxTokens: number
  supportsLogprobs: boolean
}

export interface ResponseOption {
  id: string
  model: ModelInfo
  content: string
  probability: number
  logprobs?: number[]
  isStreaming: boolean
  timestamp: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  probability?: number
  timestamp: Date
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  data?: string
}

export interface GenerationOptions {
  temperature: number
  maxTokens: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
}