export interface UserSettings {
  systemPrompt?: string
  enabledProviders?: string
  [key: string]: any
}

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

  static async getEnabledProviders(): Promise<string | undefined> {
    const settings = await this.getSettings()
    return settings.enabledProviders
  }

  static async setEnabledProviders(providers: string): Promise<void> {
    await this.updateSettings({ enabledProviders: providers })
  }
}
