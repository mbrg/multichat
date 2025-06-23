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
      })

      // Try to extract logprobs if available
      const logprobs = this.extractLogprobs()
      const probability = logprobs
        ? this.calculateProbability(logprobs)
        : this.estimateProbability(options.temperature ?? 0.7)

      return {
        content: result.text,
        logprobs,
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

  private extractLogprobs(): number[] | undefined {
    // Simplified for now - Mistral logprobs extraction not implemented
    return undefined
  }

  private calculateProbability(logprobs: number[]): number {
    if (!logprobs || logprobs.length === 0) {
      return Math.random() * 0.3 + 0.4
    }

    // Calculate average probability from logprobs
    const avgLogprob =
      logprobs.reduce((sum, logprob) => sum + logprob, 0) / logprobs.length
    const probability = Math.exp(avgLogprob)

    // Normalize to reasonable range (0.1 to 0.95)
    return Math.max(0.1, Math.min(0.95, probability))
  }

  private estimateProbability(temperature: number): number {
    // Estimate probability based on temperature and add some randomness
    const baseProb = Math.max(0.25, 1.0 - temperature * 0.6)
    const randomFactor = (Math.random() - 0.5) * 0.2
    return Math.max(0.1, Math.min(0.95, baseProb + randomFactor))
  }
}
