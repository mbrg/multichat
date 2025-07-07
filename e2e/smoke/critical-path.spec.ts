import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Critical Path Smoke Tests', () => {
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

  test('complete user journey: setup to first response', async ({ page }) => {
    // 1. Load homepage
    await chatPage.goto();
    await CustomAssertions.assertPageLoaded(page);
    
    // 2. Add API key (this will open settings automatically)
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    
    // 3. Enable the provider (required for system to be ready)
    await settingsPage.toggleProvider('openai', true);
    
    // 4. Save settings
    await settingsPage.saveSettings();
    
    // 5. Send first message
    await chatPage.sendMessage('Hello, can you help me?');
    
    // 6. Verify response received
    await chatPage.waitForAIResponse();
    
    // 7. Verify no errors
    await CustomAssertions.assertNoConsoleErrors(page);
    
    // 8. Verify message history
    await chatPage.assertMessageInHistory('Hello, can you help me?');
    
    // Total time should be reasonable
    const totalTime = await page.evaluate(() => Date.now() - window.performance.timing.navigationStart);
    expect(totalTime).toBeLessThan(30000); // 30 seconds max
  });

  test('basic chat functionality works', async ({ page }) => {
    // Setup
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Test basic chat
    await chatPage.sendMessage('What is 2+2?');
    await chatPage.waitForAIResponse();
    
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBe(2);
    
    // Test follow-up
    await chatPage.sendMessage('What about 3+3?');
    await chatPage.waitForAIResponse();
    
    const finalMessageCount = await chatPage.getMessageCount();
    expect(finalMessageCount).toBe(4);
  });

  test('possibilities panel opens and shows responses', async ({ page }) => {
    // Setup multiple providers
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    
    await settingsPage.setApiKey('anthropic', testUser.apiKeys.anthropic);
    await settingsPage.toggleProvider('anthropic', true);
    
    await settingsPage.saveSettings();
    
    // Send message
    await chatPage.sendMessage('Explain quantum computing');
    
    // Verify possibilities panel
    await chatPage.waitForPossibilitiesPanel();
    
    const possibilityCount = await chatPage.getPossibilityCount();
    expect(possibilityCount).toBeGreaterThan(1);
    
    // Wait for streaming to complete
    await chatPage.waitForStreamingComplete();
    
    // All possibilities should have content
    const possibilities = await page.locator('[data-testid^="possibility-item-"]').all();
    for (const possibility of possibilities.slice(0, 3)) {
      const content = await possibility.locator('[data-testid="possibility-content"]').textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(20);
    }
  });

  test('error handling works correctly', async ({ page }) => {
    // Setup with invalid key
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', 'invalid-key');
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Mock error response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid API key' }),
      });
    });
    
    // Send message
    await chatPage.sendMessage('Test error handling');
    
    // Should show error
    await chatPage.assertErrorMessage('Invalid API key');
    
    // Should provide recovery action
    const settingsLink = await chatPage.getByTestId('error-settings-link');
    await expect(settingsLink).toBeVisible();
  });

  test('mobile responsive design works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Setup
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Test mobile chat
    await chatPage.sendMessage('Mobile test message');
    await chatPage.waitForAIResponse();
    
    // Check mobile-specific elements
    const mobileNav = await chatPage.getByTestId('mobile-nav');
    await expect(mobileNav).toBeVisible();
    
    // Possibilities panel should be collapsed
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
    
    // Should have toggle
    const toggleButton = await chatPage.getByTestId('toggle-possibilities');
    await expect(toggleButton).toBeVisible();
  });

  test('settings persistence works', async ({ page }) => {
    // Configure settings
    await settingsPage.openSettings();
    await settingsPage.setTemperature(0.8);
    await settingsPage.setMaxTokens(1500);
    await settingsPage.setSystemPrompt('Test persistence');
    await settingsPage.saveSettings();
    
    // Reload page
    await page.reload();
    
    // Check settings persisted
    await settingsPage.openSettings();
    
    const temperature = await settingsPage.temperatureSlider.inputValue();
    expect(parseFloat(temperature)).toBe(0.8);
    
    const maxTokens = await settingsPage.maxTokensInput.inputValue();
    expect(parseInt(maxTokens)).toBe(1500);
    
    const systemPrompt = await settingsPage.getSystemPrompt();
    expect(systemPrompt).toBe('Test persistence');
  });

  test('virtual scrolling works with many possibilities', async ({ page }) => {
    // Setup multiple providers
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    
    const providers = ['openai', 'anthropic', 'google'];
    for (const provider of providers) {
      await settingsPage.setApiKey(provider, testUser.apiKeys[provider]);
      await settingsPage.toggleProvider(provider, true);
    }
    
    await settingsPage.saveSettings();
    
    // Send message
    await chatPage.sendMessage('Create many possibilities');
    await chatPage.waitForPossibilitiesPanel();
    
    // Check virtual scrolling
    await chatPage.assertVirtualScrolling();
    
    // Should handle scrolling
    await chatPage.scrollPossibilitiesPanel();
    
    // Should maintain performance
    await CustomAssertions.assertMemoryUsageStable(page);
  });

  test('keyboard navigation works', async ({ page }) => {
    // Setup
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Test keyboard shortcuts
    await chatPage.messageInput.focus();
    await page.keyboard.type('Test keyboard navigation');
    await page.keyboard.press('Enter');
    
    // Should send message
    await chatPage.waitForAIResponse();
    
    // Test escape to clear input
    await chatPage.messageInput.focus();
    await page.keyboard.type('Clear this');
    await page.keyboard.press('Escape');
    
    // Input should be cleared
    const value = await chatPage.messageInput.inputValue();
    expect(value).toBe('');
  });

  test('accessibility basics work', async ({ page }) => {
    // Setup
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    // Check basic accessibility
    await CustomAssertions.assertAccessibility(page);
    
    // Test focus management
    await chatPage.messageInput.focus();
    await chatPage.assertInputFocused();
    
    // Test screen reader announcements
    await chatPage.sendMessage('Accessibility test');
    await chatPage.waitForAIResponse();
    
    // Should have live regions
    const liveRegions = await page.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);
  });

  test('performance is acceptable', async ({ page }) => {
    // Measure initial load
    const loadStart = Date.now();
    await chatPage.goto();
    const loadTime = Date.now() - loadStart;
    
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Setup and test response time
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    const messageStart = Date.now();
    await chatPage.sendMessage('Performance test');
    await chatPage.waitForAIResponse();
    const responseTime = Date.now() - messageStart;
    
    expect(responseTime).toBeLessThan(10000); // 10 seconds max
    
    // Check memory usage
    await CustomAssertions.assertMemoryUsageStable(page);
  });

  test('core functionality works without JavaScript errors', async ({ page }) => {
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Complete core workflow
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
    
    await chatPage.sendMessage('Error-free test');
    await chatPage.waitForAIResponse();
    await chatPage.waitForPossibilitiesPanel();
    await chatPage.waitForStreamingComplete();
    
    // Should have no errors
    expect(consoleErrors).toHaveLength(0);
  });
});