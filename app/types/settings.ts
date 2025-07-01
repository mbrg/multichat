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

export interface PossibilityDefaults {
  maxInitial: number
  tokensPerPossibility: number
  tokensReasoning: number
  tokensContinuation: number
}

export interface UserSettings {
  systemPrompt?: string
  enabledProviders?: string // JSON stringified EnabledProviders
  systemInstructions?: SystemInstruction[]
  temperatures?: Temperature[]
  enabledModels?: string[]
  possibilityMultiplier?: number // How many instances of each permutation to generate (default 1)
  possibilityDefaults?: PossibilityDefaults
  [key: string]: any // Allow for future settings
}
