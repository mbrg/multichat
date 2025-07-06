import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Multi-Model Possibilities Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
    
    // Setup multiple providers
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    
    // Enable multiple providers
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    
    await settingsPage.setApiKey('anthropic', testUser.apiKeys.anthropic);
    await settingsPage.toggleProvider('anthropic', true);
    
    await settingsPage.setApiKey('google', testUser.apiKeys.google);
    await settingsPage.toggleProvider('google', true);
    
    await settingsPage.saveSettings();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should show possibilities panel with multiple models', async ({ page }) => {
    // Send a message
    await chatPage.sendMessage('What is quantum computing?');
    
    // Possibilities panel should open
    await chatPage.waitForPossibilitiesPanel();
    
    // Should show multiple possibilities
    const possibilityCount = await chatPage.getPossibilityCount();
    expect(possibilityCount).toBeGreaterThan(2);
    
    // Each possibility should have provider info
    for (let i = 0; i < possibilityCount; i++) {
      const possibility = page.locator(`[data-testid="possibility-item-${i}"]`);
      const providerLabel = possibility.locator('[data-testid="provider-label"]');
      await expect(providerLabel).toBeVisible();
    }
  });

  test('should stream responses independently', async ({ page }) => {
    await chatPage.sendMessage('Explain machine learning');
    await chatPage.waitForPossibilitiesPanel();
    
    // Get all possibility items
    const possibilities = await page.locator('[data-testid^="possibility-item-"]').all();
    
    // Each should start streaming independently
    for (let i = 0; i < Math.min(possibilities.length, 3); i++) {
      await chatPage.assertStreamingActive(`possibility-${i}`);
    }
    
    // Wait for all to complete
    await chatPage.waitForStreamingComplete();
    
    // All should have content
    for (const possibility of possibilities) {
      const content = await possibility.locator('[data-testid="possibility-content"]').textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(10);
    }
  });

  test('should enforce connection limit', async ({ page }) => {
    // Send message to trigger many possibilities
    await chatPage.sendMessage('Tell me a story');
    await chatPage.waitForPossibilitiesPanel();
    
    // Check connection count doesn't exceed limit
    await chatPage.assertConnectionLimit();
    
    // Should queue additional requests
    const queueIndicator = page.locator('[data-testid="queue-indicator"]');
    if (await queueIndicator.isVisible()) {
      await expect(queueIndicator).toContainText(/Queued: \d+/);
    }
  });

  test('should handle virtual scrolling for many possibilities', async ({ page }) => {
    // Ensure we have many possibilities
    await chatPage.sendMessage('What are the benefits of exercise?');
    await chatPage.waitForPossibilitiesPanel();
    
    // Check virtual scrolling is active
    await chatPage.assertVirtualScrolling();
    
    // Scroll through possibilities
    await chatPage.scrollPossibilitiesPanel();
    
    // Should load more items as we scroll
    const visibleBefore = await page.locator('[data-testid^="possibility-item-"]:visible').count();
    
    await chatPage.possibilitiesPanel.evaluate(el => {
      el.scrollTop = el.scrollHeight / 2;
    });
    
    await page.waitForTimeout(500); // Wait for virtual scrolling to update
    
    const visibleAfter = await page.locator('[data-testid^="possibility-item-"]:visible').count();
    expect(visibleAfter).toBeGreaterThan(0);
  });

  test('should copy possibility response', async ({ page }) => {
    await chatPage.sendMessage('Write a haiku');
    await chatPage.waitForPossibilitiesPanel();
    await chatPage.waitForStreamingComplete();
    
    // Copy first possibility
    await chatPage.copyPossibilityResponse(0);
    
    // Verify clipboard contains text
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(10);
  });

  test('should show priority for popular models', async ({ page }) => {
    await chatPage.sendMessage('Hello world');
    await chatPage.waitForPossibilitiesPanel();
    
    // Check priority ordering
    await chatPage.assertPossibilityPriority();
    
    // Popular models should appear first
    const firstPossibility = page.locator('[data-testid="possibility-item-0"]');
    const providerLabel = await firstPossibility.locator('[data-testid="provider-label"]').textContent();
    
    // Should be a popular model
    expect(['GPT-4', 'Claude', 'Gemini']).toContain(providerLabel);
  });

  test('should handle possibility interaction', async ({ page }) => {
    await chatPage.sendMessage('Explain recursion');
    await chatPage.waitForPossibilitiesPanel();
    await chatPage.waitForStreamingComplete();
    
    // Click on a possibility
    await chatPage.clickPossibility(0);
    
    // Should show expanded view
    const expandedView = page.locator('[data-testid="possibility-expanded"]');
    await expect(expandedView).toBeVisible();
    
    // Should show actions
    const copyButton = expandedView.locator('[data-testid="copy-button"]');
    const useButton = expandedView.locator('[data-testid="use-response-button"]');
    
    await expect(copyButton).toBeVisible();
    await expect(useButton).toBeVisible();
    
    // Use response should insert into chat
    await useButton.click();
    
    // Should close expanded view and show in chat
    await expect(expandedView).not.toBeVisible();
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(2);
  });

  test('should filter possibilities by provider', async ({ page }) => {
    await chatPage.sendMessage('What is AI?');
    await chatPage.waitForPossibilitiesPanel();
    
    // Get filter controls
    const filterButton = page.locator('[data-testid="filter-possibilities"]');
    await filterButton.click();
    
    const filterMenu = page.locator('[data-testid="filter-menu"]');
    await expect(filterMenu).toBeVisible();
    
    // Filter by OpenAI only
    const openAIFilter = filterMenu.locator('[data-testid="filter-openai"]');
    await openAIFilter.click();
    
    // Apply filter
    const applyButton = filterMenu.locator('[data-testid="apply-filter"]');
    await applyButton.click();
    
    // Should only show OpenAI possibilities
    const visiblePossibilities = await page.locator('[data-testid^="possibility-item-"]:visible').all();
    for (const possibility of visiblePossibilities) {
      const provider = await possibility.locator('[data-testid="provider-label"]').textContent();
      expect(provider).toContain('GPT');
    }
  });

  test('should handle provider errors gracefully', async ({ page }) => {
    // Mock one provider to fail
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      });
    });
    
    await chatPage.sendMessage('Test message');
    await chatPage.waitForPossibilitiesPanel();
    
    // Should show error for failed provider
    const errorPossibility = page.locator('[data-testid="possibility-error"]');
    await expect(errorPossibility).toBeVisible();
    await expect(errorPossibility).toContainText('Rate limit');
    
    // Other providers should still work
    const successfulPossibilities = await page.locator('[data-testid="possibility-content"]').count();
    expect(successfulPossibilities).toBeGreaterThan(0);
  });

  test('should toggle possibilities panel', async ({ page }) => {
    // Panel should be visible after sending message
    await chatPage.sendMessage('Test');
    await chatPage.waitForPossibilitiesPanel();
    
    // Toggle to hide
    await chatPage.togglePossibilitiesPanel();
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
    
    // Toggle to show again
    await chatPage.togglePossibilitiesPanel();
    await expect(chatPage.possibilitiesPanel).toBeVisible();
    
    // State should persist
    await page.reload();
    await expect(chatPage.possibilitiesPanel).toBeVisible();
  });

  test('should handle mobile possibilities view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    await chatPage.sendMessage('Mobile test');
    
    // Panel should not auto-open on mobile
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
    
    // Should have indicator
    const indicator = page.locator('[data-testid="possibilities-indicator"]');
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText(/\d+ possibilities/);
    
    // Tap to open
    await indicator.click();
    await expect(chatPage.possibilitiesPanel).toBeVisible();
    
    // Should be full screen on mobile
    const panelSize = await chatPage.possibilitiesPanel.boundingBox();
    expect(panelSize?.width).toBe(390);
  });

  test('should show loading states correctly', async ({ page }) => {
    await chatPage.sendMessage('Loading test');
    await chatPage.waitForPossibilitiesPanel();
    
    // Should show skeleton loaders initially
    const skeletons = await page.locator('[data-testid="possibility-skeleton"]').count();
    expect(skeletons).toBeGreaterThan(0);
    
    // Skeletons should be replaced by content
    await chatPage.waitForStreamingComplete();
    const skeletonsAfter = await page.locator('[data-testid="possibility-skeleton"]').count();
    expect(skeletonsAfter).toBe(0);
  });

  test('should handle empty responses', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/possibility/**', route => {
      if (route.request().url().includes('possibility-0')) {
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: 'data: {"done": true}\n\n',
        });
      } else {
        // Let other requests through
        route.continue();
      }
    });
    
    await chatPage.sendMessage('Test empty response');
    await chatPage.waitForPossibilitiesPanel();
    await chatPage.waitForStreamingComplete();
    
    // Should show appropriate message for empty response
    const emptyPossibility = page.locator('[data-testid="possibility-item-0"]');
    await expect(emptyPossibility).toContainText('No response generated');
  });

  test('should measure and display response times', async ({ page }) => {
    await chatPage.sendMessage('Performance test');
    await chatPage.waitForPossibilitiesPanel();
    await chatPage.waitForStreamingComplete();
    
    // Each possibility should show response time
    const possibilities = await page.locator('[data-testid^="possibility-item-"]').all();
    
    for (const possibility of possibilities.slice(0, 3)) {
      const responseTime = possibility.locator('[data-testid="response-time"]');
      await expect(responseTime).toBeVisible();
      
      const timeText = await responseTime.textContent();
      expect(timeText).toMatch(/\d+(\.\d+)?s/); // e.g., "1.2s"
    }
  });
});