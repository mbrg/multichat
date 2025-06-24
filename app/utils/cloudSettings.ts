import { SystemInstruction, Temperature, UserSettings } from '../types/settings'

export type { SystemInstruction, Temperature, UserSettings }

export class CloudSettings {
  static async getSettings(): Promise<UserSettings> {
    const response = await fetch('/api/settings', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to get settings: ${response.statusText}`)
    }

    return response.json()
  }

  static async updateSettings(
    updates: Partial<UserSettings>
  ): Promise<UserSettings> {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error(`Failed to update settings: ${response.statusText}`)
    }

    return response.json()
  }

  static async deleteSetting(key: string): Promise<void> {
    const response = await fetch(`/api/settings?key=${key}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete setting: ${response.statusText}`)
    }
  }

  static async deleteAllSettings(): Promise<void> {
    const response = await fetch('/api/settings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete all settings: ${response.statusText}`)
    }
  }

  // Convenience methods for specific settings
  static async getSystemPrompt(): Promise<string | undefined> {
    const settings = await this.getSettings()
    return settings.systemPrompt
  }

  static async setSystemPrompt(prompt: string): Promise<void> {
    await this.updateSettings({ systemPrompt: prompt })
  }

  // System instructions methods
  static async getSystemInstructions(): Promise<SystemInstruction[]> {
    const settings = await this.getSettings()
    return (
      settings.systemInstructions || [
        {
          id: 'default',
          name: 'default',
          content:
            'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.',
          enabled: true,
        },
      ]
    )
  }

  static async setSystemInstructions(
    instructions: SystemInstruction[]
  ): Promise<void> {
    await this.updateSettings({ systemInstructions: instructions })
  }

  // Temperature methods
  static async getTemperatures(): Promise<Temperature[]> {
    const settings = await this.getSettings()
    return (
      settings.temperatures || [
        {
          id: 'default',
          value: 0.7,
        },
      ]
    )
  }

  static async setTemperatures(temperatures: Temperature[]): Promise<void> {
    await this.updateSettings({ temperatures: temperatures })
  }

  static async getEnabledProviders(): Promise<string | undefined> {
    const settings = await this.getSettings()
    return settings.enabledProviders
  }

  static async setEnabledProviders(providers: string): Promise<void> {
    await this.updateSettings({ enabledProviders: providers })
  }

  // Reset all settings to defaults
  static async resetToDefaults(): Promise<void> {
    const defaultInstructions: SystemInstruction[] = [
      {
        id: 'default',
        name: 'default',
        content:
          'You are a helpful, creative, and insightful AI assistant. You provide clear, accurate, and thoughtful responses while considering multiple perspectives.',
        enabled: true,
      },
    ]

    const defaultTemperatures: Temperature[] = [
      {
        id: 'default',
        value: 0.7,
      },
    ]

    await this.updateSettings({
      systemInstructions: defaultInstructions,
      temperatures: defaultTemperatures,
    })
  }
}
