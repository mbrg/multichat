export interface SystemInstruction {
  id: string
  name: string
  content: string
  enabled: boolean
}

export interface Temperature {
  id: string
  value: number
}

export interface UserSettings {
  systemPrompt?: string
  enabledProviders?: string // JSON stringified EnabledProviders
  systemInstructions?: SystemInstruction[]
  temperatures?: Temperature[]
  enabledModels?: string[]
  possibilityMultiplier?: number // How many instances of each permutation to generate (default 1)
  /** Generation default settings */
  possibilityTokens?: number // Tokens for standard possibility generation
  reasoningTokens?: number // Tokens when using reasoning models
  continuationTokens?: number // Tokens for continued generation
  maxInitialPossibilities?: number // How many possibilities load initially
  [key: string]: any // Allow for future settings
}
