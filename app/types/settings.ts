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
  maxInitialPossibilities?: number // How many suggestions to auto-load (default 12)
  maxPossibilityTokens?: number // Tokens per possibility (default 100)
  maxReasoningTokens?: number // Tokens for reasoning models (default 1500)
  continuationTokens?: number // Tokens when continuing a possibility (default 1000)
  [key: string]: any // Allow for future settings
}
