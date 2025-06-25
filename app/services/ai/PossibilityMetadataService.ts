import { PermutationGenerator } from './permutations'
import type { Permutation } from '@/types/api'
import type { UserSettings } from '@/types/settings'

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
              key => parsed[key] === true
            )
          }
        } else if (Array.isArray(settings.enabledProviders)) {
          enabledProviders = settings.enabledProviders
        } else if (typeof settings.enabledProviders === 'object') {
          // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
          enabledProviders = Object.keys(settings.enabledProviders).filter(
            key => settings.enabledProviders[key] === true
          )
        }
      }
    } catch (error) {
      console.error('Failed to parse enabledProviders:', error)
      enabledProviders = []
    }

    const permutationSettings = {
      systemPrompt: settings.systemPrompt,
      enabledProviders,
      systemInstructions: settings.systemInstructions || [],
      temperatures: settings.temperatures?.map((t) => t.value) || [0.7],
    }


    // Generate permutations using existing logic
    const permutations =
      this.permutationGenerator.generatePermutations(permutationSettings)

    // Convert permutations to metadata with priority and ordering
    return permutations.map((permutation, index) => ({
      id: permutation.id,
      provider: permutation.provider,
      model: permutation.model,
      temperature: permutation.temperature,
      systemInstruction: permutation.systemInstruction || null,
      systemPrompt: permutation.systemPrompt,
      priority: this.calculatePriority(permutation, index),
      estimatedTokens: options.maxTokens || 100,
      order: index,
    }))
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
              key => parsed[key] === true
            )
          }
        } else if (Array.isArray(settings.enabledProviders)) {
          enabledProviders = settings.enabledProviders
        } else if (typeof settings.enabledProviders === 'object') {
          // Convert {openai: true, anthropic: true, google: false} to ['openai', 'anthropic']
          enabledProviders = Object.keys(settings.enabledProviders).filter(
            key => settings.enabledProviders[key] === true
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

    const permutationSettings = {
      systemPrompt: settings.systemPrompt,
      enabledProviders,
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
      id: metadata.id,
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
    // High priority for:
    // - Popular models (GPT-4, Claude-3.5, etc.)
    // - Standard temperatures (0.7)
    // - No system instruction (base response)

    const isPopularModel = this.isPopularModel(permutation.model)
    const isStandardTemperature = Math.abs(permutation.temperature - 0.7) < 0.1
    const hasNoSystemInstruction = !permutation.systemInstruction

    // High priority: popular model + standard temp + no system instruction
    if (isPopularModel && isStandardTemperature && hasNoSystemInstruction) {
      return 'high'
    }

    // Medium priority: popular model OR standard temp
    if (isPopularModel || isStandardTemperature) {
      return 'medium'
    }

    // Low priority: everything else
    return 'low'
  }

  /**
   * Check if model is considered "popular" for prioritization
   */
  private isPopularModel(modelId: string): boolean {
    const popularModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
    ]

    return popularModels.includes(modelId)
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
    if (modelId.includes('gemini-1.5-pro')) return 1.3
    if (
      modelId.includes('mini') ||
      modelId.includes('flash') ||
      modelId.includes('haiku')
    )
      return 0.8

    return 1.0 // Default multiplier
  }
}
