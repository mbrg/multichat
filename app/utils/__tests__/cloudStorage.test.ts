import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudStorage } from '../cloudStorage'
import { CloudApiKeys } from '../cloudApiKeys'
import { CloudSettings } from '../cloudSettings'

// Mock the split modules
vi.mock('../cloudApiKeys')
vi.mock('../cloudSettings')

describe('CloudStorage (Legacy Wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('storeSecrets', () => {
    it('should warn when trying to store API keys', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.mocked(CloudSettings.updateSettings).mockResolvedValue({})

      await CloudStorage.storeSecrets({
        apiKeys: { openai: 'sk-123' },
        systemInstructions: 'Be helpful',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'CloudStorage.storeSecrets: Direct API key storage is deprecated. Use individual setApiKey calls.'
      )
      expect(CloudSettings.updateSettings).toHaveBeenCalledWith({
        systemPrompt: 'Be helpful',
      })

      consoleSpy.mockRestore()
    })

    it('should map systemInstructions to systemPrompt', async () => {
      vi.mocked(CloudSettings.updateSettings).mockResolvedValue({})

      await CloudStorage.storeSecrets({
        systemInstructions: 'Be helpful',
        customSetting: 'value',
      })

      expect(CloudSettings.updateSettings).toHaveBeenCalledWith({
        systemPrompt: 'Be helpful',
        customSetting: 'value',
      })
    })
  })

  describe('getSecrets', () => {
    it('should return masked API keys and mapped settings', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: true,
        mistral: false,
        together: false,
      })

      vi.mocked(CloudSettings.getSettings).mockResolvedValue({
        systemPrompt: 'Be helpful',
        enabledProviders: '{"openai":true}',
      })

      const secrets = await CloudStorage.getSecrets()

      expect(secrets).toEqual({
        apiKeys: {
          openai: '***',
          anthropic: undefined,
          google: '***',
          mistral: undefined,
          together: undefined,
        },
        systemInstructions: 'Be helpful',
        enabledProviders: '{"openai":true}',
      })
    })
  })

  describe('storeApiKey', () => {
    it('should delegate to CloudApiKeys.setApiKey', async () => {
      vi.mocked(CloudApiKeys.setApiKey).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      await CloudStorage.storeApiKey('openai', 'sk-123')

      expect(CloudApiKeys.setApiKey).toHaveBeenCalledWith('openai', 'sk-123')
    })
  })

  describe('getApiKey', () => {
    it('should return masked value if key exists', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const key = await CloudStorage.getApiKey('openai')
      expect(key).toBe('***')
    })

    it('should return null if key does not exist', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const key = await CloudStorage.getApiKey('openai')
      expect(key).toBeNull()
    })
  })

  describe('storeSystemInstructions', () => {
    it('should delegate to CloudSettings.setSystemPrompt', async () => {
      vi.mocked(CloudSettings.setSystemPrompt).mockResolvedValue()

      await CloudStorage.storeSystemInstructions('Be helpful')

      expect(CloudSettings.setSystemPrompt).toHaveBeenCalledWith('Be helpful')
    })
  })

  describe('getSystemInstructions', () => {
    it('should delegate to CloudSettings.getSystemPrompt', async () => {
      vi.mocked(CloudSettings.getSystemPrompt).mockResolvedValue('Be helpful')

      const prompt = await CloudStorage.getSystemInstructions()

      expect(prompt).toBe('Be helpful')
    })

    it('should return null if no prompt exists', async () => {
      vi.mocked(CloudSettings.getSystemPrompt).mockResolvedValue(undefined)

      const prompt = await CloudStorage.getSystemInstructions()

      expect(prompt).toBeNull()
    })
  })

  describe('removeApiKey', () => {
    it('should delegate to CloudApiKeys.deleteApiKey', async () => {
      vi.mocked(CloudApiKeys.deleteApiKey).mockResolvedValue()

      await CloudStorage.removeApiKey('openai')

      expect(CloudApiKeys.deleteApiKey).toHaveBeenCalledWith('openai')
    })
  })

  describe('removeSystemInstructions', () => {
    it('should delete systemPrompt setting', async () => {
      vi.mocked(CloudSettings.deleteSetting).mockResolvedValue()

      await CloudStorage.removeSystemInstructions()

      expect(CloudSettings.deleteSetting).toHaveBeenCalledWith('systemPrompt')
    })
  })

  describe('removeSecret', () => {
    it('should delete API key if provider name', async () => {
      vi.mocked(CloudApiKeys.deleteApiKey).mockResolvedValue()

      await CloudStorage.removeSecret('openai')

      expect(CloudApiKeys.deleteApiKey).toHaveBeenCalledWith('openai')
    })

    it('should delete setting if not API provider', async () => {
      vi.mocked(CloudSettings.deleteSetting).mockResolvedValue()

      await CloudStorage.removeSecret('customSetting')

      expect(CloudSettings.deleteSetting).toHaveBeenCalledWith('customSetting')
    })

    it('should map systemInstructions to systemPrompt', async () => {
      vi.mocked(CloudSettings.deleteSetting).mockResolvedValue()

      await CloudStorage.removeSecret('systemInstructions')

      expect(CloudSettings.deleteSetting).toHaveBeenCalledWith('systemPrompt')
    })
  })

  describe('clearAllSecrets', () => {
    it('should clear both API keys and settings', async () => {
      vi.mocked(CloudApiKeys.deleteAllApiKeys).mockResolvedValue()
      vi.mocked(CloudSettings.deleteAllSettings).mockResolvedValue()

      await CloudStorage.clearAllSecrets()

      expect(CloudApiKeys.deleteAllApiKeys).toHaveBeenCalled()
      expect(CloudSettings.deleteAllSettings).toHaveBeenCalled()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true if API key status check succeeds', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const isAuth = await CloudStorage.isAuthenticated()

      expect(isAuth).toBe(true)
    })

    it('should return false if API key status check fails', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockRejectedValue(
        new Error('Unauthorized')
      )

      const isAuth = await CloudStorage.isAuthenticated()

      expect(isAuth).toBe(false)
    })
  })

  describe('getAllApiKeys', () => {
    it('should return masked API keys', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: true,
        mistral: false,
        together: false,
      })

      const keys = await CloudStorage.getAllApiKeys()

      expect(keys).toEqual({
        openai: '***',
        google: '***',
      })
    })
  })

  describe('hasApiKey', () => {
    it('should return true if API key exists', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const hasKey = await CloudStorage.hasApiKey('openai')

      expect(hasKey).toBe(true)
    })

    it('should return false if API key does not exist', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      const hasKey = await CloudStorage.hasApiKey('openai')

      expect(hasKey).toBe(false)
    })
  })

  describe('storeSecret', () => {
    it('should map systemInstructions to systemPrompt', async () => {
      vi.mocked(CloudSettings.updateSettings).mockResolvedValue({})

      await CloudStorage.storeSecret('systemInstructions', 'Be helpful')

      expect(CloudSettings.updateSettings).toHaveBeenCalledWith({
        systemPrompt: 'Be helpful',
      })
    })

    it('should store other secrets as-is', async () => {
      vi.mocked(CloudSettings.updateSettings).mockResolvedValue({})

      await CloudStorage.storeSecret('customSetting', 'value')

      expect(CloudSettings.updateSettings).toHaveBeenCalledWith({
        customSetting: 'value',
      })
    })
  })

  describe('getSecret', () => {
    it('should map systemInstructions to systemPrompt', async () => {
      vi.mocked(CloudSettings.getSettings).mockResolvedValue({
        systemPrompt: 'Be helpful',
      })

      const value = await CloudStorage.getSecret('systemInstructions')

      expect(value).toBe('Be helpful')
    })

    it('should get other secrets as-is', async () => {
      vi.mocked(CloudSettings.getSettings).mockResolvedValue({
        customSetting: 'value',
      })

      const value = await CloudStorage.getSecret('customSetting')

      expect(value).toBe('value')
    })
  })

  describe('getSecretsSummary', () => {
    it('should return summary of stored secrets', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: true,
        anthropic: false,
        google: true,
        mistral: false,
        together: false,
      })

      vi.mocked(CloudSettings.getSettings).mockResolvedValue({
        systemPrompt: 'Be helpful',
      })

      const summary = await CloudStorage.getSecretsSummary()

      expect(summary).toEqual({
        hasApiKeys: true,
        apiKeyProviders: ['openai', 'google'],
        hasSystemInstructions: true,
      })
    })

    it('should handle empty state', async () => {
      vi.mocked(CloudApiKeys.getApiKeyStatus).mockResolvedValue({
        openai: false,
        anthropic: false,
        google: false,
        mistral: false,
        together: false,
      })

      vi.mocked(CloudSettings.getSettings).mockResolvedValue({})

      const summary = await CloudStorage.getSecretsSummary()

      expect(summary).toEqual({
        hasApiKeys: false,
        apiKeyProviders: [],
        hasSystemInstructions: false,
      })
    })
  })
})
