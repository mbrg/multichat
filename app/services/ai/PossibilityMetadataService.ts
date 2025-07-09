import { PermutationGenerator } from './permutations'
import type { Permutation } from '@/types/api'
import type { UserSettings } from '@/types/settings'
import { TOKEN_LIMITS, getDefaultTokenLimit } from './config'

export interface PossibilityMetadata {
  id: string
  provider: string
  model: string
  temperature: number
  systemInstruction?: {
    id: string
    name: string
    content: string
    enabled: boolean
  } | null
  systemPrompt?: string
  priority: 'high' | 'medium' | 'low'
  estimatedTokens: number
  order: number
}

export interface PossibilityGenerationRequest {
  message: string
  settings: UserSettings
  options?: {
    maxTokens?: number
  }
}

export class PossibilityMetadataService {
  private permutationGenerator: PermutationGenerator

  constructor() {
    this.permutationGenerator = new PermutationGenerator()
  }

  /**
   * Generate metadata for all possibilities without executing them
   */
  generatePossibilityMetadata(
    settings: UserSettings,
    options: { maxTokens?: number } = {}
  ): PossibilityMetadata[] {
    // Convert UserSettings to the format expected by PermutationGenerator
    let enabledProviders: string[] = []
    let enabledModels: string[] = []

    try {
      if (settings?.enabledProviders) {
        if (typeof settings.enabledProviders === 'string') {
          // Parse JSON string and then convert object to array
          const parsed = JSON.parse(settings.enabledProviders)
          if (Array.isArray(parsed)) {
            enabledProviders = parsed
          } else if (typeof parsed === 'object') {
            // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
            enabledProviders = Object.keys(parsed).filter(
              (key) => parsed[key] === true
            )
          }
        } else if (Array.isArray(settings.enabledProviders)) {
          enabledProviders = settings.enabledProviders
        } else if (typeof settings.enabledProviders === 'object') {
          // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
          enabledProviders = Object.keys(settings.enabledProviders).filter(
            (key: string) =>
              (settings.enabledProviders as unknown as Record<string, boolean>)[
                key
              ] === true
          )
        }
      }
    } catch (error) {
      console.error('Failed to parse enabledProviders:', error)
      enabledProviders = []
    }

    try {
      if (Array.isArray(settings.enabledModels)) {
        enabledModels = settings.enabledModels
      }
    } catch (error) {
      console.error('Failed to parse enabledModels:', error)
      enabledModels = []
    }

    const permutationSettings = {
      systemPrompt: settings.systemPrompt,
      enabledProviders,
      enabledModels,
      systemInstructions: settings.systemInstructions || [],
      temperatures: settings.temperatures?.map((t) => t.value) || [0.7],
    }

    // Generate permutations using existing logic
    const permutations =
      this.permutationGenerator.generatePermutations(permutationSettings)

    // Apply possibility multiplier to generate multiple instances of each permutation
    const multiplier = settings.possibilityMultiplier || 1
    const allMetadata: PossibilityMetadata[] = []

    permutations.forEach((permutation, baseIndex) => {
      for (let instance = 0; instance < multiplier; instance++) {
        const uniqueId = `${permutation.id}_${instance}`
        const metadata: PossibilityMetadata = {
          id: uniqueId,
          provider: permutation.provider,
          model: permutation.model,
          temperature: permutation.temperature,
          systemInstruction: permutation.systemInstruction || null,
          systemPrompt: permutation.systemPrompt,
          priority: this.calculatePriority(permutation, baseIndex),
          estimatedTokens:
            options.maxTokens ||
            getDefaultTokenLimit(permutation.model, {
              possibilityTokens: settings.possibilityTokens,
              reasoningTokens: settings.reasoningTokens,
            }),
          order: baseIndex * multiplier + instance,
        }
        allMetadata.push(metadata)
      }
    })

    return allMetadata
  }

  /**
   * Generate metadata for a subset of possibilities (for lazy loading)
   */
  generatePossibilityMetadataRange(
    settings: UserSettings,
    startIndex: number,
    count: number,
    options: { maxTokens?: number } = {}
  ): PossibilityMetadata[] {
    const allMetadata = this.generatePossibilityMetadata(settings, options)
    return allMetadata.slice(startIndex, startIndex + count)
  }

  /**
   * Get total count of possibilities that would be generated
   */
  getTotalPossibilityCount(settings: UserSettings): number {
    // Convert UserSettings to the format expected by PermutationGenerator
    let enabledProviders: string[] = []
    let enabledModels: string[] = []

    try {
      if (settings?.enabledProviders) {
        if (typeof settings.enabledProviders === 'string') {
          // Parse JSON string and then convert object to array
          const parsed = JSON.parse(settings.enabledProviders)
          if (Array.isArray(parsed)) {
            enabledProviders = parsed
          } else if (typeof parsed === 'object') {
            // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
            enabledProviders = Object.keys(parsed).filter(
              (key) => parsed[key] === true
            )
          }
        } else if (Array.isArray(settings.enabledProviders)) {
          enabledProviders = settings.enabledProviders
        } else if (typeof settings.enabledProviders === 'object') {
          // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
          enabledProviders = Object.keys(settings.enabledProviders).filter(
            (key: string) =>
              (settings.enabledProviders as unknown as Record<string, boolean>)[
                key
              ] === true
          )
        }
      }
    } catch (error) {
      console.error(
        'Failed to parse enabledProviders in getTotalPossibilityCount:',
        error
      )
      enabledProviders = []
    }

    try {
      if (Array.isArray(settings.enabledModels)) {
        enabledModels = settings.enabledModels
      }
    } catch (error) {
      console.error(
        'Failed to parse enabledModels in getTotalPossibilityCount:',
        error
      )
      enabledModels = []
    }

    const permutationSettings = {
      systemPrompt: settings.systemPrompt,
      enabledProviders,
      enabledModels,
      systemInstructions: settings.systemInstructions || [],
      temperatures: settings.temperatures?.map((t) => t.value) || [0.7],
    }

    const permutations =
      this.permutationGenerator.generatePermutations(permutationSettings)
    return permutations.length
  }

  /**
   * Generate a specific possibility's metadata by index
   */
  getPossibilityMetadataByIndex(
    settings: UserSettings,
    index: number,
    options: { maxTokens?: number } = {}
  ): PossibilityMetadata | null {
    const allMetadata = this.generatePossibilityMetadata(settings, options)
    return allMetadata[index] || null
  }

  /**
   * Get possibility metadata by ID
   */
  getPossibilityMetadataById(
    settings: UserSettings,
    id: string,
    options: { maxTokens?: number } = {}
  ): PossibilityMetadata | null {
    const allMetadata = this.generatePossibilityMetadata(settings, options)
    return allMetadata.find((metadata) => metadata.id === id) || null
  }

  /**
   * Convert metadata back to permutation for API calls
   */
  metadataToPermutation(metadata: PossibilityMetadata): Permutation {
    return {
      id: metadata.id, // Keep the full unique ID for tracking
      provider: metadata.provider,
      model: metadata.model,
      temperature: metadata.temperature,
      systemInstruction: metadata.systemInstruction || null,
      systemPrompt: metadata.systemPrompt,
    }
  }

  /**
   * Generate possibilities in priority order for better UX
   */
  generatePrioritizedMetadata(
    settings: UserSettings,
    options: { maxTokens?: number } = {}
  ): PossibilityMetadata[] {
    const metadata = this.generatePossibilityMetadata(settings, options)

    // Sort by priority (high first) then by original order
    return metadata.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]

      if (priorityDiff !== 0) {
        return priorityDiff
      }

      // If same priority, maintain original order
      return a.order - b.order
    })
  }

  /**
   * Calculate priority based on permutation characteristics
   */
  private calculatePriority(
    permutation: Permutation,
    index: number
  ): 'high' | 'medium' | 'low' {
    // Import from config to get model priority
    const { getModelById } = require('./config')
    const model = getModelById(permutation.model)

    const isStandardTemperature = Math.abs(permutation.temperature - 0.7) < 0.1
    const isEarlyIndex = index < 8 // First 8 possibilities are always high priority

    // Use model's configured priority as base
    const modelPriority = model?.priority || 'low'

    // Boost priority for standard temperature or early index
    if (modelPriority === 'high' || isStandardTemperature || isEarlyIndex) {
      return 'high'
    }

    if (modelPriority === 'medium' || isStandardTemperature) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Estimate loading time based on model and provider
   */
  estimateLoadingTime(metadata: PossibilityMetadata): number {
    // Base time estimates in milliseconds
    const baseEstimates: Record<string, number> = {
      openai: 2000,
      anthropic: 3000,
      google: 2500,
      mistral: 2000,
      together: 1500,
      xai: 2500,
    }

    const baseTime = baseEstimates[metadata.provider] || 3000

    // Adjust for model size (larger models take longer)
    const modelSizeMultiplier = this.getModelSizeMultiplier(metadata.model)

    // Adjust for temperature (higher temps can take longer)
    const tempMultiplier = 1 + metadata.temperature * 0.2

    // Adjust for system instruction complexity
    const systemMultiplier = metadata.systemInstruction ? 1.2 : 1

    return Math.round(
      baseTime * modelSizeMultiplier * tempMultiplier * systemMultiplier
    )
  }

  /**
   * Get model size multiplier for time estimation
   */
  private getModelSizeMultiplier(modelId: string): number {
    // Larger models generally take longer
    if (modelId.includes('gpt-4o') && !modelId.includes('mini')) return 1.5
    if (modelId.includes('claude-3-5-sonnet')) return 1.4
    if (
      modelId.includes('gemini-1.5-pro') ||
      modelId.includes('gemini-2.5-pro')
    )
      return 1.3
    if (
      modelId.includes('mini') ||
      modelId.includes('flash') ||
      modelId.includes('haiku')
    )
      return 0.8

    return 1.0 // Default multiplier
  }
}
