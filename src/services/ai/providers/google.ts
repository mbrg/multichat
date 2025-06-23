import { google } from '@ai-sdk/google'
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

export class GoogleProvider implements AIProvider {
  name = 'Google'
  models = getModelsByProvider('google')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('Google API key not configured')
    }

    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const result = await generateText({
        model: google(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        topK: options.topK,
      })

      // Google doesn't provide logprobs, use shared utility for consistency
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
      console.error('Google API error:', error)
      throw new Error(
        `Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      })
      return !!result.text
    } catch (error) {
      console.error('Google API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    return await SecureStorage.decryptAndRetrieve('google-api-key')
  }
}
