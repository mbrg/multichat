import { mistral } from '@ai-sdk/mistral'
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
import { calculateProbabilityFromLogprobs } from '../../../utils/logprobs'

export class MistralProvider implements AIProvider {
  name = 'Mistral'
  models = getModelsByProvider('mistral')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('Mistral API key not configured')
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const result = await generateText({
        model: mistral(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        // Note: Mistral logprobs would be requested via provider options if supported
      })

      // Calculate real probability from logprobs if available
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
      console.error('Mistral API error:', error)
      throw new Error(
        `Mistral API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await generateText({
        model: mistral('mistral-small-latest'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      })
      return !!result.text
    } catch (error) {
      console.error('Mistral API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    return await SecureStorage.decryptAndRetrieve('mistral-api-key')
  }

}
