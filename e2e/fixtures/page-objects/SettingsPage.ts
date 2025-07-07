import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { CustomAssertions } from '../helpers/assertions';

export class SettingsPage extends BasePage {
  readonly menuButton: Locator;
  readonly settingsButton: Locator;
  readonly settingsModal: Locator;
  readonly closeButton: Locator;
  
  // AI Provider sections
  readonly openAISection: Locator;
  readonly anthropicSection: Locator;
  readonly googleSection: Locator;
  readonly mistralSection: Locator;
  readonly togetherSection: Locator;
  
  // Settings controls
  readonly temperatureSlider: Locator;
  readonly maxTokensInput: Locator;
  readonly topPSlider: Locator;
  readonly systemPromptTextarea: Locator;

  constructor(page: Page) {
    super(page);
    this.menuButton = page.locator('[data-testid="menu-button"]');
    this.settingsButton = page.locator('[data-testid="settings-button"]');
    this.settingsModal = page.locator('[data-testid="settings-modal"]');
    this.closeButton = page.locator('[data-testid="close-settings"]');
    
    // Provider sections
    this.openAISection = page.locator('[data-testid="provider-openai"]');
    this.anthropicSection = page.locator('[data-testid="provider-anthropic"]');
    this.googleSection = page.locator('[data-testid="provider-google"]');
    this.mistralSection = page.locator('[data-testid="provider-mistral"]');
    this.togetherSection = page.locator('[data-testid="provider-together"]');
    
    // Settings controls
    this.temperatureSlider = page.locator('[data-testid="temperature-slider"]');
    this.maxTokensInput = page.locator('[data-testid="max-tokens-input"]');
    this.topPSlider = page.locator('[data-testid="top-p-slider"]');
    this.systemPromptTextarea = page.locator('[data-testid="system-prompt"]');
  }

  async openMenu(): Promise<void> {
    await this.menuButton.click();
    // Wait for menu dropdown to be visible
    await expect(this.page.locator('[data-testid="menu-item-api-keys"]')).toBeVisible();
  }

  async openSettingsSection(section: string = 'api-keys'): Promise<void> {
    await this.openMenu();
    await this.page.locator(`[data-testid="menu-item-${section}"]`).click();
    await expect(this.settingsModal).toBeVisible();
  }

  async openSettings(): Promise<void> {
    // Default to opening API Keys section for backward compatibility
    await this.openSettingsSection('api-keys');
  }

  async closeSettings(): Promise<void> {
    await this.closeButton.click();
    await expect(this.settingsModal).not.toBeVisible();
  }

  async saveSettings(): Promise<void> {
    // Settings auto-save in this app, so we just close the modal
    await this.closeSettings();
  }

  async setApiKey(provider: string, apiKey: string): Promise<void> {
    const section = this.getProviderSection(provider);
    const input = section.locator('[data-testid="api-key-input"]');
    const showButton = section.locator('[data-testid="show-api-key"]');
    
    // Click show to make input visible
    await showButton.click();
    await input.fill(apiKey);
    
    // Hide the key again
    await showButton.click();
  }

  async validateApiKey(provider: string): Promise<void> {
    const section = this.getProviderSection(provider);
    const validateButton = section.locator('[data-testid="validate-api-key"]');
    
    await validateButton.click();
    
    // Wait for validation result
    const statusIndicator = section.locator('[data-testid="validation-status"]');
    await expect(statusIndicator).toBeVisible();
    
    // Check for success or error
    const status = await statusIndicator.getAttribute('data-status');
    expect(['valid', 'invalid']).toContain(status);
  }

  async toggleProvider(provider: string, enabled: boolean): Promise<void> {
    const section = this.getProviderSection(provider);
    const toggle = section.locator('[data-testid="provider-toggle"]');
    
    const isChecked = await toggle.isChecked();
    if (isChecked !== enabled) {
      await toggle.click();
    }
    
    await expect(toggle).toBeChecked({ checked: enabled });
  }

  async isProviderEnabled(provider: string): Promise<boolean> {
    const section = this.getProviderSection(provider);
    const toggle = section.locator('[data-testid="provider-toggle"]');
    return await toggle.isChecked();
  }

  async setTemperature(value: number): Promise<void> {
    await this.temperatureSlider.fill(value.toString());
    
    // Verify the value was set
    const displayValue = this.page.locator('[data-testid="temperature-value"]');
    await expect(displayValue).toHaveText(value.toString());
  }

  async setMaxTokens(value: number): Promise<void> {
    await this.maxTokensInput.fill(value.toString());
  }

  async setTopP(value: number): Promise<void> {
    await this.topPSlider.fill(value.toString());
    
    // Verify the value was set
    const displayValue = this.page.locator('[data-testid="top-p-value"]');
    await expect(displayValue).toHaveText(value.toString());
  }

  async setSystemPrompt(prompt: string): Promise<void> {
    await this.systemPromptTextarea.fill(prompt);
  }

  async getSystemPrompt(): Promise<string> {
    return await this.systemPromptTextarea.inputValue();
  }

  async resetToDefaults(): Promise<void> {
    const resetButton = this.page.locator('[data-testid="reset-defaults"]');
    await resetButton.click();
    
    // Confirm reset
    const confirmButton = this.page.locator('[data-testid="confirm-reset"]');
    await confirmButton.click();
    
    // Verify reset notification
    const notification = this.page.locator('[data-testid="reset-notification"]');
    await expect(notification).toBeVisible();
    await expect(notification).toHaveText('Settings reset to defaults');
  }

  async assertApiKeyEncrypted(provider: string): Promise<void> {
    const storageKey = `${provider}_api_key`;
    await CustomAssertions.assertApiKeyEncrypted(this.page, storageKey);
  }

  async selectModel(provider: string, model: string): Promise<void> {
    const section = this.getProviderSection(provider);
    const modelSelect = section.locator('[data-testid="model-select"]');
    await modelSelect.selectOption(model);
  }

  async getSelectedModel(provider: string): Promise<string> {
    const section = this.getProviderSection(provider);
    const modelSelect = section.locator('[data-testid="model-select"]');
    return await modelSelect.inputValue();
  }

  getProviderSection(provider: string): Locator {
    switch (provider.toLowerCase()) {
      case 'openai':
        return this.openAISection;
      case 'anthropic':
        return this.anthropicSection;
      case 'google':
        return this.googleSection;
      case 'mistral':
        return this.mistralSection;
      case 'together':
        return this.togetherSection;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async exportSettings(): Promise<void> {
    const exportButton = this.page.locator('[data-testid="export-settings"]');
    await exportButton.click();
    
    // Wait for download
    const download = await this.page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('chatsbox-settings');
  }

  async importSettings(filePath: string): Promise<void> {
    const fileInput = this.page.locator('[data-testid="import-settings-input"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for import confirmation
    const notification = this.page.locator('[data-testid="import-notification"]');
    await expect(notification).toBeVisible();
    await expect(notification).toHaveText('Settings imported successfully');
  }

  async assertSettingsPersisted(): Promise<void> {
    // Save current values
    const temperature = await this.temperatureSlider.inputValue();
    const maxTokens = await this.maxTokensInput.inputValue();
    const systemPrompt = await this.systemPromptTextarea.inputValue();
    
    // Close and reopen settings
    await this.closeSettings();
    await this.page.reload();
    await this.openSettings();
    
    // Verify values persisted
    await expect(this.temperatureSlider).toHaveValue(temperature);
    await expect(this.maxTokensInput).toHaveValue(maxTokens);
    await expect(this.systemPromptTextarea).toHaveValue(systemPrompt);
  }
}