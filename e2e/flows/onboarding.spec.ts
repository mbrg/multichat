import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('First-Time User Onboarding Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    // Clear any existing data
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should show demo interface for new users', async ({ page }) => {
    // Navigate to homepage
    await chatPage.goto();
    
    // Verify demo chat is visible
    const demoContainer = await chatPage.getByTestId('demo-chat-container');
    await CustomAssertions.assertElementVisible(demoContainer);
    
    // Verify possibilities panel is visible
    await expect(chatPage.possibilitiesPanel).toBeVisible();
    
    // Verify demo message is shown
    const demoMessage = await chatPage.getByTestId('demo-message');
    await expect(demoMessage).toContainText('Try the AI chat sandbox');
    
    // Page should load quickly
    const loadTime = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
    expect(loadTime).toBeLessThan(3000);
    
    // No console errors
    await CustomAssertions.assertNoConsoleErrors(page);
  });

  test('should guide user to API key setup', async ({ page }) => {
    await chatPage.goto();
    
    // Click Get Started CTA
    const getStartedButton = await chatPage.getByTestId('get-started-cta');
    await getStartedButton.click();
    
    // Should navigate to settings
    await expect(settingsPage.settingsModal).toBeVisible();
    
    // Should show onboarding tips
    const onboardingTip = await settingsPage.getByTestId('onboarding-tip');
    await expect(onboardingTip).toBeVisible();
    await expect(onboardingTip).toContainText('Add at least one API key to start chatting');
    
    // Provider sections should be visible
    await expect(settingsPage.openAISection).toBeVisible();
    await expect(settingsPage.anthropicSection).toBeVisible();
  });

  test('should handle API key setup flow', async ({ page }) => {
    await chatPage.goto();
    await settingsPage.openSettings();
    
    // Enter a test API key
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    
    // Toggle provider on
    await settingsPage.toggleProvider('openai', true);
    
    // Save settings
    await settingsPage.saveSettings();
    
    // Verify key is encrypted in storage
    await settingsPage.assertApiKeyEncrypted('openai');
    
    // Chat should now be enabled
    await expect(chatPage.messageInput).toBeEnabled();
    await expect(chatPage.sendButton).toBeEnabled();
  });

  test('should show helpful error for missing API keys', async ({ page }) => {
    await chatPage.goto();
    
    // Try to send a message without API keys
    await chatPage.typeWithoutSending('Hello AI!');
    await chatPage.sendButton.click();
    
    // Should show helpful error
    await chatPage.assertErrorMessage('Please add at least one API key in settings');
    
    // Error should have link to settings
    const settingsLink = page.locator('[data-testid="error-settings-link"]');
    await expect(settingsLink).toBeVisible();
    
    // Clicking link should open settings
    await settingsLink.click();
    await expect(settingsPage.settingsModal).toBeVisible();
  });

  test('should provide interactive demo', async ({ page }) => {
    await chatPage.goto();
    
    // Demo should have pre-loaded possibilities
    const possibilityCount = await chatPage.getPossibilityCount();
    expect(possibilityCount).toBeGreaterThan(0);
    
    // Clicking a possibility should show details
    await chatPage.clickPossibility(0);
    
    const possibilityDetail = await chatPage.getByTestId('possibility-detail-modal');
    await expect(possibilityDetail).toBeVisible();
    
    // Should show provider info
    const providerInfo = page.locator('[data-testid="possibility-provider"]');
    await expect(providerInfo).toBeVisible();
  });

  test('should persist onboarding state', async ({ page }) => {
    await chatPage.goto();
    
    // Complete partial onboarding
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', 'test-key');
    await settingsPage.closeSettings();
    
    // Reload page
    await page.reload();
    
    // Should remember progress
    await settingsPage.openSettings();
    const apiKeyInput = settingsPage.openAISection.locator('[data-testid="api-key-input"]');
    const showButton = settingsPage.openAISection.locator('[data-testid="show-api-key"]');
    await showButton.click();
    
    // Key should be masked but present
    const value = await apiKeyInput.inputValue();
    expect(value).toContain('••••');
  });

  test('should handle mobile onboarding', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    await chatPage.goto();
    
    // Mobile-specific elements should be visible
    const mobileMenu = await chatPage.getByTestId('mobile-menu-button');
    await expect(mobileMenu).toBeVisible();
    
    // Possibilities panel should be collapsed on mobile
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
    
    // Should have toggle button
    const toggleButton = await chatPage.getByTestId('toggle-possibilities');
    await expect(toggleButton).toBeVisible();
    
    // Toggle should work
    await toggleButton.click();
    await expect(chatPage.possibilitiesPanel).toBeVisible();
  });

  test('should track onboarding analytics', async ({ page }) => {
    // Intercept analytics calls
    const analyticsRequests: any[] = [];
    await page.route('**/api/analytics/**', route => {
      analyticsRequests.push(route.request().postDataJSON());
      route.fulfill({ status: 200 });
    });
    
    await chatPage.goto();
    
    // Should track page view
    expect(analyticsRequests.some(r => r.event === 'onboarding_start')).toBeTruthy();
    
    // Click get started
    const getStartedButton = await chatPage.getByTestId('get-started-cta');
    await getStartedButton.click();
    
    // Should track CTA click
    expect(analyticsRequests.some(r => r.event === 'get_started_clicked')).toBeTruthy();
    
    // Complete API key setup
    await settingsPage.setApiKey('openai', 'test-key');
    await settingsPage.saveSettings();
    
    // Should track completion
    expect(analyticsRequests.some(r => r.event === 'onboarding_complete')).toBeTruthy();
  });

  test('should handle browser back during onboarding', async ({ page }) => {
    await chatPage.goto();
    
    // Open settings
    await settingsPage.openSettings();
    
    // Go back
    await page.goBack();
    
    // Should close modal and return to main view
    await expect(settingsPage.settingsModal).not.toBeVisible();
    await expect(chatPage.messagesContainer).toBeVisible();
    
    // State should be preserved
    await page.goForward();
    await expect(settingsPage.settingsModal).toBeVisible();
  });

  test('should show provider comparison', async ({ page }) => {
    await chatPage.goto();
    
    // Click learn more about providers
    const learnMoreButton = await chatPage.getByTestId('learn-more-providers');
    await learnMoreButton.click();
    
    // Should show comparison modal
    const comparisonModal = await chatPage.getByTestId('provider-comparison-modal');
    await expect(comparisonModal).toBeVisible();
    
    // Should list key differences
    const providerCards = page.locator('[data-testid^="provider-card-"]');
    expect(await providerCards.count()).toBeGreaterThan(3);
    
    // Each card should have key info
    for (const card of await providerCards.all()) {
      await expect(card.locator('[data-testid="provider-name"]')).toBeVisible();
      await expect(card.locator('[data-testid="provider-strengths"]')).toBeVisible();
      await expect(card.locator('[data-testid="provider-pricing"]')).toBeVisible();
    }
  });
});