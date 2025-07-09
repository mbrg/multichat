export interface ApiKeyStatus {
  openai: boolean
  anthropic: boolean
  google: boolean
  mistral: boolean
  together: boolean
  xai: boolean
}

export class CloudApiKeys {
  static async getApiKeyStatus(): Promise<ApiKeyStatus> {
    const response = await fetch('/api/apikeys', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to get API key status: ${response.statusText}`)
    }

    const data = await response.json()
    return data.status
  }

  static async setApiKey(
    provider: string,
    apiKey: string
  ): Promise<ApiKeyStatus> {
    const response = await fetch('/api/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    })

    if (!response.ok) {
      throw new Error(`Failed to set API key: ${response.statusText}`)
    }

    const data = await response.json()
    return data.status
  }

  static async deleteApiKey(provider: string): Promise<void> {
    const response = await fetch(`/api/apikeys?provider=${provider}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete API key: ${response.statusText}`)
    }
  }

  static async deleteAllApiKeys(): Promise<void> {
    const response = await fetch('/api/apikeys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete all API keys: ${response.statusText}`)
    }
  }
}
