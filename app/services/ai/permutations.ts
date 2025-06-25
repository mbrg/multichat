import type { Permutation, ChatCompletionRequest } from '@/types/api'
import type { SystemInstruction } from '@/types/settings'
import { getAllModels } from './config'
import { DEFAULT_SYSTEM_INSTRUCTION } from '@/constants/defaults'

export class PermutationGenerator {
  /**
   * Generate all permutations of providers, models, temperatures, and system instructions
   */
  generatePermutations(
    settings: ChatCompletionRequest['settings']
  ): Permutation[] {
    const permutations: Permutation[] = []

    // Guard against undefined or non-iterable enabledProviders
    if (!settings.enabledProviders || !Array.isArray(settings.enabledProviders)) {
      console.error('enabledProviders is not a valid array:', settings.enabledProviders)
      return []
    }

    // For each enabled provider
    for (const provider of settings.enabledProviders) {
      // Get models for this provider
      const models = this.getModelsForProvider(provider)

      // For each model
      for (const model of models) {
        // For each temperature
        for (const temperature of settings.temperatures) {
          // For each system instruction - ensure we always have at least one
          const instructions: SystemInstruction[] = 
            settings.systemInstructions.length > 0 
              ? settings.systemInstructions 
              : [DEFAULT_SYSTEM_INSTRUCTION]

          for (const instruction of instructions) {
            permutations.push({
              id: this.generatePermutationId(
                provider,
                model.id,
                temperature,
                instruction
              ),
              provider,
              model: model.id,
              temperature,
              systemInstruction: instruction,
              systemPrompt: settings.systemPrompt,
            })
          }
        }
      }
    }

    return permutations
  }

  /**
   * Get available models for a provider
   */
  private getModelsForProvider(provider: string) {
    return getAllModels().filter((model) => model.provider === provider)
  }

  /**
   * Generate a unique ID for a permutation
   */
  private generatePermutationId(
    provider: string,
    model: string,
    temperature: number,
    instruction: SystemInstruction | null
  ): string {
    const parts = [
      provider,
      model.replace(/[^a-zA-Z0-9]/g, '-'),
      `temp${temperature}`,
      instruction ? `inst-${instruction.id}` : 'no-inst',
    ]

    return parts.join('_')
  }

  /**
   * Calculate the total number of permutations that will be generated
   */
  calculatePermutationCount(
    settings: ChatCompletionRequest['settings']
  ): number {
    let count = 0

    // Guard against undefined or non-iterable enabledProviders
    if (!settings.enabledProviders || !Array.isArray(settings.enabledProviders)) {
      console.error('enabledProviders is not a valid array in calculatePermutationCount:', settings.enabledProviders)
      return 0
    }

    for (const provider of settings.enabledProviders) {
      const modelCount = this.getModelsForProvider(provider).length
      const temperatureCount = settings.temperatures.length
      const instructionCount = settings.systemInstructions.length > 0 
        ? settings.systemInstructions.length 
        : 1 // Default instruction

      count += modelCount * temperatureCount * instructionCount
    }

    return count
  }
}
