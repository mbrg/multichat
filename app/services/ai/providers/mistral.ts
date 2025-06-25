import { mistral } from '@ai-sdk/mistral'
import type { ModelInfo, GenerationOptions } from '../../../types/ai'
import { getModelsByProvider } from '../config'
import { AbstractAIProvider } from './AbstractAIProvider'

export class MistralProvider extends AbstractAIProvider {
  readonly name = 'Mistral'
  readonly models = getModelsByProvider('mistral')

  protected async createModel(modelId: string, apiKey: string): Promise<any> {
    return mistral(modelId)
  }

  protected getProviderOptions(
    options: GenerationOptions,
    model: ModelInfo
  ): Record<string, any> {
    return {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? model.maxTokens,
      topP: options.topP,
    }
  }

  protected getValidationModelId(): string {
    return 'mistral-small-latest'
  }
}