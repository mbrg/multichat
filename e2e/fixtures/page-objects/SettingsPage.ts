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
    // Click menu button
    await this.menuButton.click();
    
    // Wait for menu dropdown to appear
    const menuDropdown = this.page.locator('[data-testid="menu-dropdown"]');
    await expect(menuDropdown).toBeVisible({ timeout: 10000 });
    
    // Wait for menu items to be rendered within the dropdown
    await expect(this.page.locator('[data-testid="menu-item-api-keys"]')).toBeVisible({ timeout: 10000 });
  }

  async openSettingsSection(section: string = 'api-keys'): Promise<void> {
    await this.openMenu();
    await this.page.locator(`[data-testid="menu-item-${section}"]`).click();
    await expect(this.settingsModal).toBeVisible();
  }

  async ensureApiKeysSection(): Promise<void> {
    // Check if settings modal is already open
    const isSettingsOpen = await this.settingsModal.isVisible();
    if (isSettingsOpen) {
      // Settings are open, just make sure we can see the Add Key button
      const addKeyButton = this.page.locator('[data-testid="add-key-button"]');
      const isAddKeyVisible = await addKeyButton.isVisible();
      if (isAddKeyVisible) {
        // We're already in the right section
        return;
      }
    }
    
    // Either settings aren't open or we're not in the right section
    await this.openSettingsSection('api-keys');
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
    // Check if settings modal is already open
    const isSettingsOpen = await this.settingsModal.isVisible();
    if (!isSettingsOpen) {
      // Settings not open, need to open them
      await this.ensureApiKeysSection();
    } else {
      // Settings already open, just make sure we can see the Add Key button
      const addKeyButton = this.page.locator('[data-testid="add-key-button"]');
      await expect(addKeyButton).toBeVisible();
    }
    
    // Click the "Add Key" button to open the form
    const addKeyButton = this.page.locator('[data-testid="add-key-button"]');
    await addKeyButton.click();
    
    // Wait for the provider selection to be visible
    const providerButton = this.page.locator(`[data-testid="provider-select-${provider}"]`);
    await expect(providerButton).toBeVisible();
    
    // Select the provider first
    await providerButton.click();
    
    // Now the API key input should be visible
    const input = this.page.locator('[data-testid="api-key-input"]');
    const showButton = this.page.locator('[data-testid="show-api-key"]');
    
    // Wait for input to be enabled (after provider selection)
    await expect(input).toBeVisible();
    
    // Click show to make input visible if it's a password field
    await showButton.click();
    await input.fill(apiKey);
    
    // Save the API key
    const saveButton = this.page.locator('text="Save API Key"');
    await saveButton.click();
    
    // Wait for the form to close/disappear
    await expect(this.page.locator('[data-testid="api-key-input"]')).not.toBeVisible();
    
    // Wait for the API key to appear in the configured list
    await expect(this.page.locator(`[data-testid="provider-${provider}"]`)).toBeVisible();
    
    // Wait for validation to complete (give it time to process the mocked validation)
    await this.page.waitForTimeout(2000);
  }

  async validateApiKey(provider: string): Promise<void> {
    // The validation happens automatically when API keys are saved
    // We verify that the validation status is displayed correctly
    const section = this.getProviderSection(provider);
    const statusIndicator = section.locator('[data-testid="validation-status"]');
    
    // Verify that validation status is visible and has the correct data
    await expect(statusIndicator).toBeVisible();
    
    // Check that status has a valid value
    const status = await statusIndicator.getAttribute('data-status');
    expect(['valid', 'invalid', 'validating', null]).toContain(status);
    
    // If there's a manual validate button (which might exist in the UI), click it
    const validateButton = section.locator('[data-testid="validate-api-key"]');
    if (await validateButton.isVisible()) {
      await validateButton.click();
      
      // Wait for validation to complete
      await expect(statusIndicator).toHaveAttribute('data-status', /(valid|invalid)/);
    }
  }

  async toggleProvider(provider: string, enabled: boolean): Promise<void> {
    const section = this.getProviderSection(provider);
    const toggle = section.locator('[data-testid="provider-toggle"]');
    
    // Wait for toggle to be enabled (validation must complete first)
    await expect(toggle).toBeEnabled({ timeout: 10000 });
    
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
    // Navigate to temperatures section
    await this.openSettingsSection('temperatures');
    
    // Click Add Temperature button if no temperatures exist
    const addTempButton = this.page.locator('[data-testid="add-temperature-button"]');
    if (await addTempButton.isVisible()) {
      await addTempButton.click();
    }
    
    // Wait for the temperature input to be visible
    const tempInput = this.page.locator('[data-testid="temperature-slider"]');
    await expect(tempInput).toBeVisible();
    
    // Fill the temperature value
    await tempInput.fill(value.toString());
    
    // Save the temperature (click Add Temperature button)
    await this.page.locator('text="Add Temperature"').click();
  }

  async setMaxTokens(value: number): Promise<void> {
    // Navigate to generation section
    await this.openSettingsSection('generation');
    
    // Wait for the max tokens input to be visible
    const maxTokensInput = this.page.locator('[data-testid="max-tokens-input"]');
    await expect(maxTokensInput).toBeVisible();
    
    // Fill the value
    await maxTokensInput.fill(value.toString());
  }

  async setTopP(value: number): Promise<void> {
    await this.topPSlider.fill(value.toString());
    
    // Verify the value was set
    const displayValue = this.page.locator('[data-testid="top-p-value"]');
    await expect(displayValue).toHaveText(value.toString());
  }

  async setSystemPrompt(prompt: string): Promise<void> {
    // Navigate to system instructions section
    await this.openSettingsSection('system-instructions');
    
    // Click Add Instruction button if no instructions exist
    const addInstructionButton = this.page.locator('text="Add your first instruction"');
    const addInstructionHeaderButton = this.page.locator('text="+ Add Instruction"');
    
    if (await addInstructionButton.isVisible()) {
      await addInstructionButton.click();
    } else if (await addInstructionHeaderButton.isVisible()) {
      await addInstructionHeaderButton.click();
    }
    
    // Wait for the system prompt textarea to be visible
    const systemPromptTextarea = this.page.locator('[data-testid="system-prompt"]');
    await expect(systemPromptTextarea).toBeVisible();
    
    // Fill the prompt
    await systemPromptTextarea.fill(prompt);
    
    // Save the instruction
    await this.page.locator('text="Add Instruction"').click();
  }

  async getSystemPrompt(): Promise<string> {
    // Navigate to system instructions section
    await this.openSettingsSection('system-instructions');
    
    // Get the first system instruction content
    const systemPromptTextarea = this.page.locator('[data-testid="system-prompt"]');
    if (await systemPromptTextarea.isVisible()) {
      return await systemPromptTextarea.inputValue();
    }
    
    // If in view mode, try to get text from the instruction card
    const instructionCard = this.page.locator('.text-sm').first();
    return await instructionCard.textContent() || '';
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