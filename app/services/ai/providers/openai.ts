import { createOpenAI } from '@ai-sdk/openai'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

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
}
