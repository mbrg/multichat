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
import { SecureStorage } from '../../../utils/crypto'

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

      // Anthropic doesn't provide logprobs, so we estimate probability
      const probability = this.estimateProbability(options.temperature ?? 0.7)

      return {
        content: result.text,
        logprobs: undefined, // Anthropic doesn't provide logprobs
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
    return await SecureStorage.decryptAndRetrieve('anthropic-api-key')
  }

  private estimateProbability(temperature: number): number {
    // Since Anthropic doesn't provide logprobs, we estimate probability
    // based on temperature and add some randomness for variety
    const baseProb = Math.max(0.2, 1.0 - temperature * 0.8)
    const randomFactor = (Math.random() - 0.5) * 0.3
    return Math.max(0.1, Math.min(0.95, baseProb + randomFactor))
  }
}
