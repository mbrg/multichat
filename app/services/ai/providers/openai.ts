import { createOpenAI } from '@ai-sdk/openai'
import type { ModelInfo, GenerationOptions, ResponseWithLogprobs, Message } from '../../../types/ai'
import type { StreamingOptions } from './AbstractAIProvider'
import { getModelsByProvider, isReasoningModel, TOKEN_LIMITS } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'
import { generateText } from 'ai'
import { ServerKeys } from '../../../utils/serverKeys'

export class OpenAIProvider extends AbstractAIProvider {
  readonly name = 'OpenAI'
  readonly models = getModelsByProvider('openai')
  

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    const openaiProvider = createOpenAI({
      apiKey: apiKey,
    })
    return openaiProvider(modelId)
  }

  protected getProviderOptions(
    options: GenerationOptions,
    model: ModelInfo
  ): Record<string, any> {
    // Special handling for reasoning models
    if (model.isReasoningModel) {
      // Reasoning models have fixed temperature and don't support certain parameters
      // Use configured minimum token limit for reasoning models
      const reasoningTokens = Math.max(
        options.maxTokens ?? TOKEN_LIMITS.POSSIBILITY_REASONING, 
        TOKEN_LIMITS.POSSIBILITY_REASONING
      )
      return {
        maxTokens: reasoningTokens,
        // Temperature is fixed at 1.0 for reasoning models and cannot be changed
        // Other parameters like topP, frequencyPenalty, presencePenalty are not supported
      }
    }
    
    // Standard models
    return {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? model.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
    }
  }

  protected getValidationModelId(): string {
    return 'gpt-4o-mini'
  }

  /**
   * Override streaming for o1 models which may have limited streaming support
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
    // For reasoning models, fall back to non-streaming approach
    if (model.isReasoningModel) {
      
      try {
        // Get API key
        const apiKey = await ServerKeys.getApiKey(this.getProviderKey())
        if (!apiKey) {
          throw new Error('Invalid API key')
        }

        // Format messages
        const formattedMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
        
        // Create model
        const providerModel = await this.createModel(model.id, apiKey)
        
        // Get provider options (already handles o1 special case)
        const providerOptions = this.getProviderOptions(options, model)
        
        // Use generateText instead of streamText for o1 models
        const result = await generateText({
          model: providerModel,
          messages: formattedMessages,
          ...providerOptions,
        })
        
        // Simulate streaming by yielding the entire content at once
        const content = result.text || ''
        
        // Yield the content as a single token
        yield {
          type: 'token',
          token: content,
        }
        
        // Create response object
        const response: ResponseWithLogprobs = {
          content,
          logprobs: undefined,
          probability: null,
          finishReason: result.finishReason || 'stop',
          usage: result.usage ? {
            promptTokens: result.usage.promptTokens || 0,
            completionTokens: result.usage.completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          } : undefined,
        }
        
        // Yield completion
        yield {
          type: 'complete',
          response,
        }
      } catch (error) {
        console.error(`[${this.name}] Error with reasoning model:`, error)
        throw error
      }
    } else {
      // Use default streaming for non-reasoning models
      yield* super.generateStreamingResponse(messages, model, options)
    }
  }
}
