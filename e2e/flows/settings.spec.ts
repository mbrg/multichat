import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Advanced Settings Configuration Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
    
    // Setup basic configuration
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should configure temperature settings', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Test different temperature values
    const temperatures = [0.1, 0.5, 0.7, 1.0, 1.5, 2.0];
    
    for (const temp of temperatures) {
      await settingsPage.setTemperature(temp);
      
      // Verify slider reflects value
      const sliderValue = await settingsPage.temperatureSlider.inputValue();
      expect(parseFloat(sliderValue)).toBe(temp);
      
      // Verify display shows correct value
      const displayValue = await settingsPage.getByTestId('temperature-value').textContent();
      expect(displayValue).toContain(temp.toString());
    }
    
    // Save and verify persistence
    await settingsPage.saveSettings();
    await settingsPage.assertSettingsPersisted();
  });

  test('should configure max tokens with validation', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Test valid token limits
    const validTokens = [100, 500, 1000, 2000, 4000];
    
    for (const tokens of validTokens) {
      await settingsPage.setMaxTokens(tokens);
      
      // Should accept valid values
      const value = await settingsPage.maxTokensInput.inputValue();
      expect(parseInt(value)).toBe(tokens);
    }
    
    // Test invalid values
    await settingsPage.setMaxTokens(-100);
    
    // Should show validation error
    const validationError = await settingsPage.getByTestId('max-tokens-error');
    await expect(validationError).toBeVisible();
    await expect(validationError).toContainText('must be positive');
    
    // Test extremely high values
    await settingsPage.setMaxTokens(1000000);
    
    // Should show warning about costs
    const costWarning = await settingsPage.getByTestId('token-cost-warning');
    await expect(costWarning).toBeVisible();
  });

  test('should configure system prompts', async ({ page }) => {
    await settingsPage.openSettings();
    
    const customPrompts = [
      'You are a helpful assistant.',
      'You are a creative writer who loves poetry.',
      'You are a technical expert in software development.',
      'You are a teacher explaining complex concepts simply.',
    ];
    
    for (const prompt of customPrompts) {
      await settingsPage.setSystemPrompt(prompt);
      
      // Verify prompt is set
      const currentPrompt = await settingsPage.getSystemPrompt();
      expect(currentPrompt).toBe(prompt);
      
      // Save and test in chat
      await settingsPage.saveSettings();
      
      // Send message to verify prompt is used
      await chatPage.sendMessage('Tell me about yourself');
      await chatPage.waitForAIResponse();
      
      // Reopen settings to continue testing
      await settingsPage.openSettings();
    }
  });

  test('should configure provider-specific models', async ({ page }) => {
    await settingsPage.openSettings();
    
    const providerModels = {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      google: ['gemini-pro', 'gemini-pro-vision'],
    };
    
    for (const [provider, models] of Object.entries(providerModels)) {
      // Enable provider
      await settingsPage.setApiKey(provider, TestDataFactory.createTestUser().apiKeys[provider]);
      await settingsPage.toggleProvider(provider, true);
      
      // Test each model
      for (const model of models) {
        await settingsPage.selectModel(provider, model);
        
        // Verify selection
        const selectedModel = await settingsPage.getSelectedModel(provider);
        expect(selectedModel).toBe(model);
      }
    }
    
    await settingsPage.saveSettings();
  });

  test('should handle settings validation', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Test invalid combinations
    await settingsPage.setTemperature(0);
    await settingsPage.setTopP(0);
    
    // Should show warning about deterministic output
    const deterministicWarning = await settingsPage.getByTestId('deterministic-warning');
    await expect(deterministicWarning).toBeVisible();
    
    // Test conflicting settings
    await settingsPage.setTemperature(2.0);
    await settingsPage.setTopP(0.1);
    
    // Should show guidance about setting interaction
    const settingsGuidance = await settingsPage.getByTestId('settings-guidance');
    await expect(settingsGuidance).toBeVisible();
  });

  test('should save and restore settings profiles', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Create custom profile
    await settingsPage.setTemperature(0.8);
    await settingsPage.setMaxTokens(1500);
    await settingsPage.setSystemPrompt('Creative writing assistant');
    await settingsPage.saveSettings();
    
    // Save as profile
    const saveProfileButton = await settingsPage.getByTestId('save-profile');
    await saveProfileButton.click();
    
    const profileNameInput = await settingsPage.getByTestId('profile-name-input');
    await profileNameInput.fill('Creative Writer');
    
    const confirmSaveButton = await settingsPage.getByTestId('confirm-save-profile');
    await confirmSaveButton.click();
    
    // Change settings
    await settingsPage.openSettings();
    await settingsPage.setTemperature(0.1);
    await settingsPage.setMaxTokens(500);
    await settingsPage.saveSettings();
    
    // Load profile
    await settingsPage.openSettings();
    const loadProfileButton = await settingsPage.getByTestId('load-profile');
    await loadProfileButton.click();
    
    const profileOption = await settingsPage.getByTestId('profile-creative-writer');
    await profileOption.click();
    
    // Verify settings restored
    const temperature = await settingsPage.temperatureSlider.inputValue();
    expect(parseFloat(temperature)).toBe(0.8);
    
    const maxTokens = await settingsPage.maxTokensInput.inputValue();
    expect(parseInt(maxTokens)).toBe(1500);
  });

  test('should handle provider priority settings', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Enable multiple providers
    const providers = ['openai', 'anthropic', 'google'];
    const testUser = TestDataFactory.createTestUser();
    
    for (const provider of providers) {
      await settingsPage.setApiKey(provider, testUser.apiKeys[provider]);
      await settingsPage.toggleProvider(provider, true);
    }
    
    // Configure priority order
    const prioritySection = await settingsPage.getByTestId('provider-priority');
    await expect(prioritySection).toBeVisible();
    
    // Drag and drop to reorder
    const openaiItem = prioritySection.locator('[data-testid="priority-openai"]');
    const anthropicItem = prioritySection.locator('[data-testid="priority-anthropic"]');
    
    await openaiItem.dragTo(anthropicItem);
    
    // Save and verify order
    await settingsPage.saveSettings();
    
    // Send message and check priority order
    await chatPage.sendMessage('Test priority');
    await chatPage.waitForPossibilitiesPanel();
    
    await chatPage.assertPossibilityPriority();
  });

  test('should configure response filtering', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Configure content filters
    const contentFilters = await settingsPage.getByTestId('content-filters');
    await expect(contentFilters).toBeVisible();
    
    // Enable safety filter
    const safetyFilter = contentFilters.locator('[data-testid="safety-filter"]');
    await safetyFilter.check();
    
    // Configure response length filter
    const lengthFilter = contentFilters.locator('[data-testid="length-filter"]');
    await lengthFilter.check();
    
    const minLength = contentFilters.locator('[data-testid="min-length"]');
    await minLength.fill('50');
    
    const maxLength = contentFilters.locator('[data-testid="max-length"]');
    await maxLength.fill('500');
    
    await settingsPage.saveSettings();
    
    // Test filtering in chat
    await chatPage.sendMessage('Short');
    await chatPage.waitForAIResponse();
    
    // Should enforce length requirements
    const response = await chatPage.getLastMessage();
    expect(response.length).toBeGreaterThan(50);
    expect(response.length).toBeLessThan(500);
  });

  test('should handle theme and appearance settings', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Test theme switching
    const themeSection = await settingsPage.getByTestId('theme-settings');
    await expect(themeSection).toBeVisible();
    
    const darkModeToggle = themeSection.locator('[data-testid="dark-mode-toggle"]');
    await darkModeToggle.click();
    
    // Should apply dark theme
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark-theme/);
    
    // Test font size
    const fontSizeSlider = themeSection.locator('[data-testid="font-size-slider"]');
    await fontSizeSlider.fill('18');
    
    // Should update font size
    const messageText = await chatPage.getByTestId('message-text');
    const fontSize = await messageText.evaluate(el => window.getComputedStyle(el).fontSize);
    expect(parseInt(fontSize)).toBe(18);
    
    // Test color scheme
    const colorSchemeSelect = themeSection.locator('[data-testid="color-scheme-select"]');
    await colorSchemeSelect.selectOption('blue');
    
    // Should apply color scheme
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
    });
    expect(primaryColor).toContain('blue');
  });

  test('should export and import settings', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Configure custom settings
    await settingsPage.setTemperature(0.9);
    await settingsPage.setMaxTokens(2000);
    await settingsPage.setSystemPrompt('Export test prompt');
    await settingsPage.saveSettings();
    
    // Export settings
    await settingsPage.exportSettings();
    
    // Verify export contains encrypted data
    const exportedData = await page.evaluate(() => {
      return localStorage.getItem('last_export') || '{}';
    });
    
    const settings = JSON.parse(exportedData);
    expect(settings.temperature).toBe(0.9);
    expect(settings.maxTokens).toBe(2000);
    expect(settings.systemPrompt).toBe('Export test prompt');
    
    // API keys should be encrypted
    expect(settings.apiKeys.openai).not.toContain('sk-');
  });

  test('should handle settings reset', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Change settings from defaults
    await settingsPage.setTemperature(1.5);
    await settingsPage.setMaxTokens(3000);
    await settingsPage.setSystemPrompt('Custom prompt');
    await settingsPage.saveSettings();
    
    // Reset to defaults
    await settingsPage.resetToDefaults();
    
    // Verify defaults restored
    const temperature = await settingsPage.temperatureSlider.inputValue();
    expect(parseFloat(temperature)).toBe(0.7);
    
    const maxTokens = await settingsPage.maxTokensInput.inputValue();
    expect(parseInt(maxTokens)).toBe(1000);
    
    const systemPrompt = await settingsPage.getSystemPrompt();
    expect(systemPrompt).toBe('You are a helpful AI assistant.');
  });

  test('should handle settings synchronization across tabs', async ({ browser }) => {
    // Create second tab
    const context = await browser.newContext();
    const page2 = await context.newPage();
    const settingsPage2 = new SettingsPage(page2);
    
    // Change settings in first tab
    await settingsPage.openSettings();
    await settingsPage.setTemperature(1.2);
    await settingsPage.saveSettings();
    
    // Check second tab
    await page2.goto('/');
    await settingsPage2.openSettings();
    
    // Should reflect changes
    const temperature = await settingsPage2.temperatureSlider.inputValue();
    expect(parseFloat(temperature)).toBe(1.2);
    
    // Cleanup
    await context.close();
  });

  test('should validate settings before saving', async ({ page }) => {
    await settingsPage.openSettings();
    
    // Set invalid combination
    await settingsPage.setTemperature(2.5); // Too high
    await settingsPage.setMaxTokens(0); // Too low
    
    // Try to save
    await settingsPage.saveButton.click();
    
    // Should show validation errors
    const tempError = await settingsPage.getByTestId('temperature-validation-error');
    await expect(tempError).toBeVisible();
    await expect(tempError).toContainText('must be between 0 and 2');
    
    const tokensError = await settingsPage.getByTestId('max-tokens-validation-error');
    await expect(tokensError).toBeVisible();
    await expect(tokensError).toContainText('must be greater than 0');
    
    // Save should be disabled
    await expect(settingsPage.saveButton).toBeDisabled();
  });
});