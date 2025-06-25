import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GoogleProvider } from './providers/google'
import { MistralProvider } from './providers/mistral'
import { TogetherProvider } from './providers/together'
import { ServerKeys } from '../../utils/serverKeys'
import { compareProbabilities } from '../../utils/logprobs'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseOption,
} from '../../types/ai'
import type { StreamingOptions } from './providers/AbstractAIProvider'
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
    options: StreamingOptions = {}
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

  /**
   * Generate streaming response with real token-level streaming
   */
  async *generateStreamingResponse(
    messages: Message[],
    modelId: string,
    options: StreamingOptions = {}
  ): AsyncGenerator<{
    type: 'token' | 'complete'
    token?: string
    response?: ResponseOption
  }> {
    const model = getModelById(modelId)
    if (!model) {
      throw new Error(`Model not found: ${modelId}`)
    }

    const provider = this.getProvider(model.provider)
    if (!provider) {
      throw new Error(`Provider not found: ${model.provider}`)
    }

    // Check if provider supports streaming (has the new method)
    if (
      !('generateStreamingResponse' in provider) ||
      typeof provider.generateStreamingResponse !== 'function'
    ) {
      throw new Error(`Provider ${model.provider} does not support streaming`)
    }

    try {
      const streamingProvider = provider as any // Type assertion for streaming method
      const streamGenerator = streamingProvider.generateStreamingResponse(
        messages,
        model,
        options
      )

      for await (const event of streamGenerator) {
        if (event.type === 'token') {
          yield {
            type: 'token',
            token: event.token,
          }
        } else if (event.type === 'complete') {
          yield {
            type: 'complete',
            response: {
              id: crypto.randomUUID(),
              model,
              content: event.response.content,
              probability: event.response.probability,
              logprobs: event.response.logprobs,
              isStreaming: true,
              temperature: options.temperature,
              finishReason: event.response.finishReason,
              usage: event.response.usage,
            },
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to generate streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      // Sort by probability (highest first), handle null values
      return responses.sort((a, b) =>
        compareProbabilities(a.probability, b.probability)
      )
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

      // Sort all responses by probability, handle null values
      return successfulResponses.sort((a, b) =>
        compareProbabilities(a.probability, b.probability)
      )
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

    // Note: API key validation now happens through server-side storage
    // This method is deprecated and should use the CloudApiKeys/CloudSettings APIs instead
    console.warn(
      'AIService.validateApiKey() is deprecated. Use CloudApiKeys for API key management.'
    )

    try {
      // For now, just check if we can access the provider's validate method
      // In practice, validation should happen when storing keys via CloudStorage
      return await provider.validateApiKey()
    } catch (error) {
      console.error(`API key validation failed for ${providerName}:`, error)
      return false
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
