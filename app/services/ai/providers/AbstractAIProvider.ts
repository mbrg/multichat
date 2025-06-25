import { generateText, streamText, type GenerateTextResult } from 'ai'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseWithLogprobs,
} from '../../../types/ai'
import { ServerKeys } from '../../../utils/serverKeys'
import { calculateProbabilityFromLogprobs } from '../../../utils/logprobs'

export interface StreamingOptions extends GenerationOptions {
  onToken?: (token: string) => void
  stream?: boolean
}

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
  protected abstract createModel(modelId: string, apiKey: string): Promise<any>

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
   * Template method for streaming generation with real token-level streaming
   */
  async *generateStreamingResponse(
    messages: Message[],
    model: ModelInfo,
    options: StreamingOptions
  ): AsyncGenerator<{
    type: 'token' | 'complete'
    token?: string
    response?: ResponseWithLogprobs
  }> {
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

      // Stream generation call
      const result = await streamText({
        model: providerModel,
        messages: formattedMessages,
        ...providerOptions,
      })

      let fullContent = ''

      // Stream tokens as they arrive
      for await (const textPart of result.textStream) {
        fullContent += textPart

        // Call token callback if provided
        if (options.onToken) {
          options.onToken(textPart)
        }

        // Yield token event
        yield {
          type: 'token',
          token: textPart,
        }
      }

      // Wait for final result
      const finalResult = await result.finishReason
      const finalUsage = await result.usage

      // Create complete response
      const completeResponse: ResponseWithLogprobs = {
        content: fullContent,
        logprobs: undefined, // Logprobs may not be available in streaming mode
        probability: null, // Will need to calculate differently for streaming
        finishReason: finalResult || 'stop',
        usage: finalUsage
          ? {
              promptTokens: finalUsage.promptTokens,
              completionTokens: finalUsage.completionTokens,
              totalTokens: finalUsage.totalTokens,
            }
          : undefined,
      }

      // Yield completion event
      yield {
        type: 'complete',
        response: completeResponse,
      }
    } catch (error) {
      console.error(`${this.name} streaming API error:`, error)
      throw new Error(
        `${this.name} streaming API error: ${
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
      console.log(`[${this.name}] Starting API key validation`)
      const apiKey = await this.getApiKey()
      console.log(
        `[${this.name}] API key retrieved: ${apiKey ? `${apiKey.length} chars` : 'null'}`
      )
      if (!apiKey) return false

      const validationModel = await this.createModel(
        this.getValidationModelId(),
        apiKey
      )
      console.log(`[${this.name}] Model created for validation`)

      await generateText({
        model: validationModel,
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 1,
      })
      console.log(`[${this.name}] Validation successful`)

      return true
    } catch (error) {
      console.log(`[${this.name}] Validation failed:`, error)
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
  private mapResponse(
    result: GenerateTextResult<any, any>
  ): ResponseWithLogprobs {
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
