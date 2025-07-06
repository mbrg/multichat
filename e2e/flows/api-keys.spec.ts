import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('API Key Management Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should add and validate OpenAI API key', async ({ page }) => {
    await settingsPage.openSettings();
    
    const testUser = TestDataFactory.createTestUser();
    
    // Enter API key
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    
    // Validate key format
    await settingsPage.validateApiKey('openai');
    
    // Check validation status
    const validationStatus = settingsPage.openAISection.locator('[data-testid="validation-status"]');
    await expect(validationStatus).toHaveAttribute('data-status', 'valid');
    
    // Enable provider
    await settingsPage.toggleProvider('openai', true);
    
    // Save settings
    await settingsPage.saveSettings();
    
    // Verify encryption
    await settingsPage.assertApiKeyEncrypted('openai');
  });

  test('should handle invalid API key format', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Enter invalid key
    await settingsPage.setApiKey('openai', 'invalid-key-format');
    
    // Should show format error immediately
    const formatError = settingsPage.openAISection.locator('[data-testid="format-error"]');
    await expect(formatError).toBeVisible();
    await expect(formatError).toContainText('Invalid API key format');
    
    // Validation button should be disabled
    const validateButton = settingsPage.openAISection.locator('[data-testid="validate-api-key"]');
    await expect(validateButton).toBeDisabled();
  });

  test('should mask API keys in UI', async ({ page }) => {
    await settingsPage.openSettings();
    
    const testKey = 'sk-test-1234567890abcdef';
    await settingsPage.setApiKey('openai', testKey);
    
    // Key should be masked by default
    const keyInput = settingsPage.openAISection.locator('[data-testid="api-key-input"]');
    await expect(keyInput).toHaveAttribute('type', 'password');
    
    // Toggle visibility
    const showButton = settingsPage.openAISection.locator('[data-testid="show-api-key"]');
    await showButton.click();
    
    // Should show full key
    await expect(keyInput).toHaveAttribute('type', 'text');
    await expect(keyInput).toHaveValue(testKey);
    
    // Toggle back to hidden
    await showButton.click();
    await expect(keyInput).toHaveAttribute('type', 'password');
  });

  test('should manage multiple provider keys', async ({ page }) => {
    await settingsPage.openSettings();
    
    const testUser = TestDataFactory.createTestUser();
    
    // Add multiple provider keys
    const providers = ['openai', 'anthropic', 'google'];
    
    for (const provider of providers) {
      await settingsPage.setApiKey(provider, testUser.apiKeys[provider]);
      await settingsPage.toggleProvider(provider, true);
    }
    
    // Save all
    await settingsPage.saveSettings();
    
    // Verify all are encrypted
    for (const provider of providers) {
      await settingsPage.assertApiKeyEncrypted(provider);
    }
    
    // Reopen settings
    await settingsPage.openSettings();
    
    // All should show as configured
    for (const provider of providers) {
      const isEnabled = await settingsPage.isProviderEnabled(provider);
      expect(isEnabled).toBe(true);
    }
  });

  test('should update existing API key', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Add initial key
    await settingsPage.setApiKey('openai', 'sk-old-key');
    await settingsPage.saveSettings();
    
    // Reopen and update
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', 'sk-new-key');
    await settingsPage.saveSettings();
    
    // Verify new key is saved
    await settingsPage.assertApiKeyEncrypted('openai');
    
    // Old key should not be accessible
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('openai_api_key');
    });
    expect(storedValue).not.toContain('old-key');
  });

  test('should remove API key', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Add key
    await settingsPage.setApiKey('openai', 'sk-test-key');
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Remove key
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', '');
    
    // Provider should auto-disable
    const isEnabled = await settingsPage.isProviderEnabled('openai');
    expect(isEnabled).toBe(false);
    
    await settingsPage.saveSettings();
    
    // Key should be removed from storage
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('openai_api_key');
    });
    expect(storedValue).toBeNull();
  });

  test('should validate API key with provider', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Mock validation endpoint
    await page.route('**/api/validate-key/**', route => {
      const url = route.request().url();
      if (url.includes('valid-key')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ valid: true, models: ['gpt-4', 'gpt-3.5-turbo'] }),
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ valid: false, error: 'Invalid API key' }),
        });
      }
    });
    
    // Test valid key
    await settingsPage.setApiKey('openai', 'sk-valid-key');
    await settingsPage.validateApiKey('openai');
    
    let validationStatus = settingsPage.openAISection.locator('[data-testid="validation-status"]');
    await expect(validationStatus).toHaveAttribute('data-status', 'valid');
    
    // Test invalid key
    await settingsPage.setApiKey('openai', 'sk-invalid-key');
    await settingsPage.validateApiKey('openai');
    
    validationStatus = settingsPage.openAISection.locator('[data-testid="validation-status"]');
    await expect(validationStatus).toHaveAttribute('data-status', 'invalid');
    
    const errorMessage = settingsPage.openAISection.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toContainText('Invalid API key');
  });

  test('should sync encryption key across tabs', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const settingsPage1 = new SettingsPage(page1);
    const settingsPage2 = new SettingsPage(page2);
    
    // Add key in first tab
    await page1.goto('/');
    await settingsPage1.openSettings();
    await settingsPage1.setApiKey('openai', 'sk-test-key');
    await settingsPage1.saveSettings();
    
    // Open second tab
    await page2.goto('/');
    await settingsPage2.openSettings();
    
    // Key should be accessible in second tab
    const keyInput = settingsPage2.openAISection.locator('[data-testid="api-key-input"]');
    const showButton = settingsPage2.openAISection.locator('[data-testid="show-api-key"]');
    await showButton.click();
    
    const value = await keyInput.inputValue();
    expect(value).toContain('••••'); // Should show masked value
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should handle provider-specific key formats', async ({ page }) => {
    await settingsPage.openSettings();
    
    const keyFormats = {
      openai: 'sk-proj-abc123',
      anthropic: 'sk-ant-api03-abc123',
      google: 'AIzaSyAbc123',
      mistral: 'abc123',
      together: 'abc123def456',
    };
    
    for (const [provider, key] of Object.entries(keyFormats)) {
      await settingsPage.setApiKey(provider, key);
      
      // Should accept provider-specific format
      const formatError = settingsPage.getProviderSection(provider)
        .locator('[data-testid="format-error"]');
      await expect(formatError).not.toBeVisible();
    }
  });

  test('should show API usage warnings', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Add keys
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    
    // Look for usage warning
    const usageWarning = settingsPage.openAISection.locator('[data-testid="usage-warning"]');
    await expect(usageWarning).toBeVisible();
    await expect(usageWarning).toContainText('API calls will incur costs');
  });

  test('should export and import API keys', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Add some keys
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.setApiKey('anthropic', testUser.apiKeys.anthropic);
    await settingsPage.saveSettings();
    
    // Export settings
    await settingsPage.openSettings();
    await settingsPage.exportSettings();
    
    // Clear all data
    await chatPage.clearLocalStorage();
    
    // Import settings
    await settingsPage.openSettings();
    await settingsPage.importSettings('./e2e/fixtures/test-settings.json');
    
    // Keys should be restored (but still encrypted)
    await settingsPage.assertApiKeyEncrypted('openai');
    await settingsPage.assertApiKeyEncrypted('anthropic');
  });

  test('should handle key rotation', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Add initial key
    await settingsPage.setApiKey('openai', 'sk-old-key-123');
    await settingsPage.saveSettings();
    
    // Simulate key rotation notification
    await page.evaluate(() => {
      window.postMessage({
        type: 'API_KEY_ROTATION_REQUIRED',
        provider: 'openai',
        reason: 'Key compromised',
      }, '*');
    });
    
    // Should show rotation warning
    await settingsPage.openSettings();
    const rotationWarning = settingsPage.openAISection.locator('[data-testid="rotation-warning"]');
    await expect(rotationWarning).toBeVisible();
    await expect(rotationWarning).toContainText('Key rotation required');
    
    // Update to new key
    await settingsPage.setApiKey('openai', 'sk-new-key-456');
    await settingsPage.saveSettings();
    
    // Warning should be cleared
    await settingsPage.openSettings();
    await expect(rotationWarning).not.toBeVisible();
  });

  test('should integrate with password managers', async ({ page }) => {
    await settingsPage.openSettings();
    
    // API key inputs should have proper autocomplete attributes
    const keyInput = settingsPage.openAISection.locator('[data-testid="api-key-input"]');
    await expect(keyInput).toHaveAttribute('autocomplete', 'off');
    await expect(keyInput).toHaveAttribute('data-lpignore', 'true'); // LastPass
    await expect(keyInput).toHaveAttribute('data-1p-ignore', 'true'); // 1Password
  });
});