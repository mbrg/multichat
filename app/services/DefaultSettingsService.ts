import type { UserSettings, UserSettingsMetadata } from '../types/settings'

// Current settings version - increment when making breaking changes
export const CURRENT_SETTINGS_VERSION = 1

// Create default settings with proper configuration
export function createDefaultSettings(): UserSettings {
  const metadata: UserSettingsMetadata = {
    version: CURRENT_SETTINGS_VERSION,
    lastUpdated: new Date().toISOString(),
  }

  const defaultSettings: UserSettings = {
    _metadata: metadata,

    // Provider configuration - start with OpenAI as most accessible
    enabledProviders: JSON.stringify({
      openai: true,
      anthropic: false,
      google: false,
      mistral: false,
      together: false,
    }),

    // Default models - focus on most popular and reliable options
    enabledModels: [
      'gpt-4o', // High priority, multimodal flagship
      'gpt-4-turbo', // Medium priority, fast and capable
      'gpt-4', // Medium priority, classic reliable model
      'o1-preview', // High priority, reasoning model
    ],

    // Temperature variety for different use cases
    temperatures: [
      {
        id: 'low',
        value: 0.3,
      },
      {
        id: 'medium',
        value: 0.7,
      },
      {
        id: 'high',
        value: 1.0,
      },
    ],

    // Empty system instructions by default - user can add their own
    systemInstructions: [],

    // Default system prompt
    systemPrompt: 'You are a helpful AI assistant.',

    // Generation settings
    possibilityMultiplier: 1,
    maxInitialPossibilities: 12,
    possibilityTokens: 100,
    reasoningTokens: 1500,
    continuationTokens: 1000,
  }

  return defaultSettings
}

// Migration function for future version updates
export function migrateSettings(existingSettings: UserSettings): UserSettings {
  const currentVersion = existingSettings._metadata?.version || 0

  if (currentVersion >= CURRENT_SETTINGS_VERSION) {
    return existingSettings
  }

  // Start with current settings
  let migratedSettings = { ...existingSettings }

  // Apply migrations based on version gaps
  if (currentVersion < 1) {
    // Migration from version 0 to 1: Add metadata and missing defaults
    const defaults = createDefaultSettings()

    migratedSettings = {
      ...defaults,
      ...migratedSettings,
      _metadata: {
        version: CURRENT_SETTINGS_VERSION,
        lastUpdated: new Date().toISOString(),
        migratedFrom: currentVersion,
      },
    }

    // Ensure enabled providers is properly formatted
    if (!migratedSettings.enabledProviders) {
      migratedSettings.enabledProviders = defaults.enabledProviders
    }

    // Ensure we have some enabled models
    if (
      !migratedSettings.enabledModels ||
      migratedSettings.enabledModels.length === 0
    ) {
      migratedSettings.enabledModels = defaults.enabledModels
    }

    // Ensure we have temperature options
    if (
      !migratedSettings.temperatures ||
      migratedSettings.temperatures.length === 0
    ) {
      migratedSettings.temperatures = defaults.temperatures
    }

    // Set reasonable defaults for generation settings
    if (migratedSettings.possibilityMultiplier === undefined) {
      migratedSettings.possibilityMultiplier = defaults.possibilityMultiplier
    }

    if (migratedSettings.maxInitialPossibilities === undefined) {
      migratedSettings.maxInitialPossibilities =
        defaults.maxInitialPossibilities
    }

    if (migratedSettings.possibilityTokens === undefined) {
      migratedSettings.possibilityTokens = defaults.possibilityTokens
    }

    if (migratedSettings.reasoningTokens === undefined) {
      migratedSettings.reasoningTokens = defaults.reasoningTokens
    }

    if (migratedSettings.continuationTokens === undefined) {
      migratedSettings.continuationTokens = defaults.continuationTokens
    }
  }

  // Future migrations would go here
  // if (currentVersion < 2) { ... }

  return migratedSettings
}

// Validation function to ensure settings are complete and valid
export function validateSettings(settings: UserSettings): boolean {
  // Check for required fields
  if (!settings.enabledProviders) return false
  if (!settings.enabledModels || settings.enabledModels.length === 0)
    return false
  if (!settings.temperatures || settings.temperatures.length === 0) return false

  // Validate enabledProviders JSON
  try {
    const providers = JSON.parse(settings.enabledProviders)
    const hasEnabledProvider = Object.values(providers).some(
      (enabled) => enabled === true
    )
    if (!hasEnabledProvider) return false
  } catch {
    return false
  }

  // Validate temperature structure
  const validTemperatures = settings.temperatures.every(
    (temp) =>
      typeof temp.id === 'string' &&
      typeof temp.value === 'number' &&
      temp.value >= 0 &&
      temp.value <= 2
  )
  if (!validTemperatures) return false

  return true
}
