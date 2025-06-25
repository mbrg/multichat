import { generateText } from 'ai'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseWithLogprobs,
} from '../../../types/ai'
import { ServerKeys } from '../../../utils/serverKeys'
import { calculateProbabilityFromLogprobs } from '../../../utils/logprobs'

/**
 * Abstract base class for AI providers using Template Method pattern.
 * Eliminates 95% code duplication while maintaining provider-specific customization.
 */
export abstract class AbstractAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly models: ModelInfo[]

  /**
   * Abstract method to get the provider-specific model instance
   */
  protected abstract createModel(
    modelId: string,
    apiKey: string
  ): Promise<any>

  /**
   * Abstract method to get provider-specific generation options
   */
  protected abstract getProviderOptions(
    options: GenerationOptions,
    model: ModelInfo
  ): Record<string, any>

  /**
   * Abstract method to get the validation model ID for testing API keys
   */
  protected abstract getValidationModelId(): string

  /**
   * Get provider name for ServerKeys (defaults to lowercase name)
   */
  protected getProviderKey(): string {
    return this.name.toLowerCase()
  }

  /**
   * Template method implementing the common generation flow
   */
  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    try {
      // Common API key validation
      const apiKey = await this.getApiKey()
      if (!apiKey) {
        throw new Error(`${this.name} API key not configured`)
      }

      // Common message formatting
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Provider-specific model creation
      const providerModel = await this.createModel(model.id, apiKey)

      // Provider-specific options
      const providerOptions = this.getProviderOptions(options, model)

      // Common generation call
      const result = await generateText({
        model: providerModel,
        messages: formattedMessages,
        ...providerOptions,
      })

      // Common response mapping
      return this.mapResponse(result)
    } catch (error) {
      console.error(`${this.name} API error:`, error)
      throw new Error(
        `${this.name} API error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  /**
   * Template method for API key validation
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey()
      if (!apiKey) return false

      const validationModel = await this.createModel(
        this.getValidationModelId(),
        apiKey
      )

      await generateText({
        model: validationModel,
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 1,
      })

      return true
    } catch {
      return false
    }
  }

  /**
   * Common API key retrieval
   */
  private async getApiKey(): Promise<string | null> {
    return await ServerKeys.getApiKey(this.getProviderKey())
  }

  /**
   * Common response mapping logic
   */
  private mapResponse(result: any): ResponseWithLogprobs {
    const probability = calculateProbabilityFromLogprobs(result.logprobs)

    return {
      content: result.text,
      logprobs: result.logprobs,
      probability,
      finishReason: result.finishReason || 'stop',
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    }
  }
}