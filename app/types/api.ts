import type { SystemInstruction } from './settings'
import type { Message } from './ai'
import type { LogProbData } from '../utils/logprobs'

export type ChatMessage = Message

// Chat completion request types
export interface ChatCompletionRequest {
  messages: ChatMessage[]
  settings: {
    systemPrompt?: string
    enabledProviders: string[]
    enabledModels?: string[]
    systemInstructions: SystemInstruction[]
    temperatures: number[]
  }
  options: {
    maxTokens?: number
    stream?: boolean
    mode: 'possibilities' | 'continuation'
    continuationId?: string
  }
}

// Individual possibility response
export interface PossibilityResponse {
  id: string
  provider: string
  model: string
  content: string
  temperature: number
  systemInstruction?: string
  probability: number | null
  logprobs?: LogProbData
  timestamp: Date
  metadata: {
    permutationId: string
    hasLogprobs: boolean
  }
}

// Non-streaming response
export interface ChatCompletionResponse {
  possibilities: PossibilityResponse[]
}

// Streaming event types
export type StreamEventType =
  | 'possibility_start'
  | 'token'
  | 'probability'
  | 'possibility_complete'
  | 'error'
  | 'done'

export interface StreamEvent {
  type: StreamEventType
  data: any
}

export interface PossibilityStartEvent {
  type: 'possibility_start'
  data: {
    id: string
    provider: string
    model: string
    temperature: number
    systemInstruction?: string
  }
}

export interface TokenEvent {
  type: 'token'
  data: {
    id: string
    token: string
  }
}

export interface ProbabilityEvent {
  type: 'probability'
  data: {
    id: string
    probability: number | null
    logprobs?: LogProbData
  }
}

export interface PossibilityCompleteEvent {
  type: 'possibility_complete'
  data: {
    id: string
  }
}

export interface ErrorEvent {
  type: 'error'
  data: {
    id?: string
    message: string
  }
}

export interface DoneEvent {
  type: 'done'
}

// Permutation types
export interface Permutation {
  id: string
  provider: string
  model: string
  temperature: number
  systemInstruction: SystemInstruction | null
  systemPrompt?: string
}
