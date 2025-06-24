import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import type {
  AIProvider,
  Message,
  ModelInfo,
  GenerationOptions,
  ResponseWithLogprobs,
} from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { ServerKeys } from '../../../utils/serverKeys'
import { calculateProbabilityFromLogprobs } from '../../../utils/logprobs'

export class AnthropicProvider implements AIProvider {
  name = 'Anthropic'
  models = getModelsByProvider('anthropic')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const result = await generateText({
        model: anthropic(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        topK: options.topK,
      })

      // Anthropic doesn't provide logprobs, use shared utility for consistency
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
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(
        `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await generateText({
        model: anthropic('claude-3-5-haiku-20241022'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      })
      return !!result.text
    } catch (error) {
      console.error('Anthropic API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    return await ServerKeys.getApiKey('anthropic')
  }
}
