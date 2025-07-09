/**
 * AI Provider Constants
 *
 * Centralized definition of all AI providers to eliminate duplication
 * across the codebase and ensure consistency.
 */

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  MISTRAL: 'mistral',
  TOGETHER: 'together',
  XAI: 'xai',
} as const

export type AIProviderType = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS]

/**
 * Array of all provider IDs for iteration and validation
 */
export const AI_PROVIDER_LIST: AIProviderType[] = Object.values(AI_PROVIDERS)

/**
 * Validate if a string is a valid provider ID
 */
export function isValidProvider(provider: string): provider is AIProviderType {
  return AI_PROVIDER_LIST.includes(provider as AIProviderType)
}

/**
 * Provider display names for UI
 */
export const PROVIDER_NAMES: Record<AIProviderType, string> = {
  [AI_PROVIDERS.OPENAI]: 'OpenAI',
  [AI_PROVIDERS.ANTHROPIC]: 'Anthropic',
  [AI_PROVIDERS.GOOGLE]: 'Google',
  [AI_PROVIDERS.MISTRAL]: 'Mistral',
  [AI_PROVIDERS.TOGETHER]: 'Together AI',
  [AI_PROVIDERS.XAI]: 'xAI',
}

/**
 * Provider descriptions for UI
 */
export const PROVIDER_DESCRIPTIONS: Record<AIProviderType, string> = {
  [AI_PROVIDERS.OPENAI]: 'GPT-4, GPT-3.5-Turbo',
  [AI_PROVIDERS.ANTHROPIC]: 'Claude 3, Claude 2',
  [AI_PROVIDERS.GOOGLE]: 'Gemini 2.5 Pro & Flash',
  [AI_PROVIDERS.MISTRAL]: 'Mistral Large, Mistral Small',
  [AI_PROVIDERS.TOGETHER]: 'Llama 2, Code Llama',
  [AI_PROVIDERS.XAI]: 'Grok models',
}

/**
 * Default enabled state for each provider
 */
export const DEFAULT_PROVIDER_STATE: Record<AIProviderType, boolean> = {
  [AI_PROVIDERS.OPENAI]: false,
  [AI_PROVIDERS.ANTHROPIC]: false,
  [AI_PROVIDERS.GOOGLE]: false,
  [AI_PROVIDERS.MISTRAL]: false,
  [AI_PROVIDERS.TOGETHER]: false,
  [AI_PROVIDERS.XAI]: false,
}
