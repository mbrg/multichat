import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GoogleProvider } from './providers/google'
import { MistralProvider } from './providers/mistral'
import { TogetherProvider } from './providers/together'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseOption,
} from '../../types/ai'
import {
  getAllModels,
  getModelById,
  getDefaultTemperatureRange,
} from './config'

export class AIService {
  private providers: Map<string, AIProvider> = new Map()

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    this.providers.set('openai', new OpenAIProvider())
    this.providers.set('anthropic', new AnthropicProvider())
    this.providers.set('google', new GoogleProvider())
    this.providers.set('mistral', new MistralProvider())
    this.providers.set('together', new TogetherProvider())
  }

  getAvailableModels(): ModelInfo[] {
    return getAllModels()
  }

  getProvider(providerName: string): AIProvider | undefined {
    return this.providers.get(providerName)
  }

  async generateSingleResponse(
    messages: Message[],
    modelId: string,
    options: GenerationOptions = {}
  ): Promise<ResponseOption> {
    const model = getModelById(modelId)
    if (!model) {
      throw new Error(`Model not found: ${modelId}`)
    }

    const provider = this.getProvider(model.provider)
    if (!provider) {
      throw new Error(`Provider not found: ${model.provider}`)
    }

    try {
      const response = await provider.generateResponse(messages, model, options)

      return {
        id: crypto.randomUUID(),
        model,
        content: response.content,
        probability: response.probability,
        logprobs: response.logprobs,
        isStreaming: false,
        temperature: options.temperature,
        finishReason: response.finishReason,
        usage: response.usage,
      }
    } catch (error) {
      throw new Error(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async generateVariations(
    messages: Message[],
    modelId: string,
    count: number = 3,
    baseOptions: GenerationOptions = {}
  ): Promise<ResponseOption[]> {
    const model = getModelById(modelId)
    if (!model) {
      throw new Error(`Model not found: ${modelId}`)
    }

    const temperatures = getDefaultTemperatureRange(count)
    const promises = temperatures.map((temperature) =>
      this.generateSingleResponse(messages, modelId, {
        ...baseOptions,
        temperature,
      })
    )

    try {
      const responses = await Promise.all(promises)
      // Sort by probability (highest first)
      return responses.sort((a, b) => b.probability - a.probability)
    } catch (error) {
      throw new Error(
        `Failed to generate variations: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async generateMultiModelResponses(
    messages: Message[],
    enabledModels: string[],
    variationsPerModel: number = 3,
    baseOptions: GenerationOptions = {}
  ): Promise<ResponseOption[]> {
    const promises = enabledModels.map((modelId) =>
      this.generateVariations(
        messages,
        modelId,
        variationsPerModel,
        baseOptions
      )
    )

    try {
      const allResponses = await Promise.allSettled(promises)
      const successfulResponses = allResponses
        .filter(
          (result): result is PromiseFulfilledResult<ResponseOption[]> =>
            result.status === 'fulfilled'
        )
        .flatMap((result) => result.value)

      // Sort all responses by probability
      return successfulResponses.sort((a, b) => b.probability - a.probability)
    } catch (error) {
      throw new Error(
        `Failed to generate multi-model responses: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(providerName: string, apiKey: string): Promise<boolean> {
    const provider = this.getProvider(providerName)
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`)
    }

    // Store the API key temporarily for validation
    const storageKey = `${providerName}-api-key`
    const originalKey = localStorage.getItem(storageKey)
    localStorage.setItem(storageKey, apiKey)

    try {
      const isValid = await provider.validateApiKey()
      if (!isValid && originalKey) {
        // Restore original key if validation failed
        localStorage.setItem(storageKey, originalKey)
      } else if (!isValid) {
        // Remove invalid key
        localStorage.removeItem(storageKey)
      }
      return isValid
    } catch (error) {
      // Restore original key on error
      if (originalKey) {
        localStorage.setItem(storageKey, originalKey)
      } else {
        localStorage.removeItem(storageKey)
      }
      throw error
    }
  }

  cancelPendingRequests(): void {
    // TODO: Implement request cancellation
    console.log('Cancelling pending requests...')
  }
}

// Export singleton instance
export const aiService = new AIService()

// Export types and utilities
export * from '../../types/ai'
export * from './config'
