import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
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

export class TogetherProvider implements AIProvider {
  name = 'Together AI'
  models = getModelsByProvider('together')

  async generateResponse(
    messages: Message[],
    model: ModelInfo,
    options: GenerationOptions
  ): Promise<ResponseWithLogprobs> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('Together AI API key not configured')
    }

    try {
      const together = createOpenAICompatible({
        apiKey,
        baseURL: 'https://api.together.xyz/v1',
        name: 'together',
      })

      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      const result = await generateText({
        model: together(model.id),
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? model.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
      })

      // Estimate probability based on temperature
      const probability = this.estimateProbability(options.temperature ?? 0.7)

      return {
        content: result.text,
        logprobs: undefined, // Simplified for now
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
      console.error('Together AI API error:', error)
      throw new Error(
        `Together AI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey()
      if (!apiKey) {
        return false
      }

      const together = createOpenAICompatible({
        apiKey,
        baseURL: 'https://api.together.xyz/v1',
        name: 'together',
      })

      const result = await generateText({
        model: together('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'),
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      })
      return !!result.text
    } catch (error) {
      console.error('Together AI API key validation failed:', error)
      return false
    }
  }

  private async getApiKey(): Promise<string | null> {
    return await SecureStorage.decryptAndRetrieve('together-api-key')
  }

  private estimateProbability(temperature: number): number {
    // Estimate probability based on temperature and add some randomness
    const baseProb = Math.max(0.2, 1.0 - temperature * 0.7)
    const randomFactor = (Math.random() - 0.5) * 0.25
    return Math.max(0.1, Math.min(0.95, baseProb + randomFactor))
  }
}
