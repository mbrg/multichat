import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Error Recovery Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    
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

  test('should handle API rate limit errors', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': '0',
        },
        body: JSON.stringify({
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        }),
      });
    });
    
    await chatPage.sendMessage('Test message');
    
    // Should show user-friendly error
    await chatPage.assertErrorMessage('Rate limit exceeded. Please try again in 60 seconds.');
    
    // Should show retry timer
    const retryTimer = await chatPage.getByTestId('retry-timer');
    await expect(retryTimer).toBeVisible();
    await expect(retryTimer).toContainText(/Retry in \d+ seconds/);
    
    // Should not crash the app
    await CustomAssertions.assertNoConsoleErrors(page);
  });

  test('should handle invalid API key errors', async ({ page }) => {
    // Mock invalid key response
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid API key provided',
            type: 'invalid_api_key',
            code: 'invalid_api_key',
          },
        }),
      });
    });
    
    await chatPage.sendMessage('Test message');
    
    // Should show clear error with action
    await chatPage.assertErrorMessage('Invalid API key');
    
    // Should provide link to settings
    const settingsLink = await chatPage.getByTestId('error-settings-link');
    await expect(settingsLink).toBeVisible();
    
    // Clicking should open settings
    await settingsLink.click();
    await expect(settingsPage.settingsModal).toBeVisible();
    
    // Should highlight problematic provider
    const openAISection = settingsPage.openAISection;
    await expect(openAISection).toHaveClass(/error-highlight/);
  });

  test('should handle network timeouts', async ({ page }) => {
    // Mock slow network
    await page.route('**/api/**', async route => {
      await TestDataFactory.delay(35000); // Exceed typical timeout
      route.abort();
    });
    
    // Send message
    const messagePromise = chatPage.sendMessage('Test timeout');
    
    // Should show timeout error within reasonable time
    await page.waitForTimeout(32000);
    await chatPage.assertErrorMessage('Request timed out');
    
    // Should allow retry
    const retryButton = await chatPage.getByTestId('retry-message');
    await expect(retryButton).toBeVisible();
  });

  test('should handle network disconnection', async ({ page }) => {
    // Send initial message successfully
    await chatPage.setupMocks();
    await chatPage.sendMessage('First message');
    await chatPage.waitForAIResponse();
    
    // Simulate offline
    await page.context().setOffline(true);
    
    // Try to send another message
    await chatPage.sendMessage('Offline message');
    
    // Should show offline error
    await chatPage.assertErrorMessage('No internet connection');
    
    // Should show offline indicator
    const offlineIndicator = await chatPage.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should auto-retry or allow manual retry
    await page.waitForTimeout(1000); // Wait for reconnection
    
    const retryButton = await chatPage.getByTestId('retry-message');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
    
    // Should work now
    await chatPage.setupMocks();
    await chatPage.waitForAIResponse();
  });

  test('should activate circuit breaker after repeated failures', async ({ page }) => {
    // Mock consistent failures
    let failureCount = 0;
    await page.route('**/api.openai.com/**', route => {
      failureCount++;
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Send multiple messages to trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      await chatPage.sendMessage(`Test message ${i + 1}`);
      await page.waitForTimeout(500);
    }
    
    // Circuit breaker should activate
    await CustomAssertions.assertCircuitBreakerStatus(page, 'openai', 'open');
    
    // Should show circuit breaker message
    const circuitBreakerMessage = await chatPage.getByTestId('circuit-breaker-message');
    await expect(circuitBreakerMessage).toBeVisible();
    await expect(circuitBreakerMessage).toContainText('temporarily unavailable');
    
    // Should suggest alternative providers
    const alternatives = await chatPage.getByTestId('alternative-providers');
    await expect(alternatives).toBeVisible();
  });

  test('should handle quota exceeded errors', async ({ page }) => {
    // Mock quota exceeded
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Monthly quota exceeded',
            type: 'quota_exceeded',
            code: 'quota_exceeded',
          },
        }),
      });
    });
    
    await chatPage.sendMessage('Test quota');
    
    // Should show quota error
    await chatPage.assertErrorMessage('Monthly quota exceeded');
    
    // Should suggest alternatives
    const suggestions = await chatPage.getByTestId('quota-suggestions');
    await expect(suggestions).toBeVisible();
    await expect(suggestions).toContainText('Try using a different provider');
  });

  test('should handle malformed responses', async ({ page }) => {
    // Mock malformed response
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid json',
      });
    });
    
    await chatPage.sendMessage('Test malformed');
    
    // Should handle gracefully
    await chatPage.assertErrorMessage('Unexpected response format');
    
    // Should log details for debugging
    const errorDetails = await chatPage.getByTestId('error-details-toggle');
    await errorDetails.click();
    
    const details = await chatPage.getByTestId('error-details');
    await expect(details).toBeVisible();
    await expect(details).toContainText('JSON');
  });

  test('should recover from streaming interruption', async ({ page }) => {
    // Mock streaming that gets interrupted
    await page.route('**/api/possibility/**', route => {
      const encoder = new TextEncoder();
      let messagesSent = 0;
      
      const stream = new ReadableStream({
        async start(controller) {
          const messages = [
            'data: {"token": "Hello "}\n\n',
            'data: {"token": "world"}\n\n',
            // Interrupt here
          ];
          
          for (const message of messages) {
            controller.enqueue(encoder.encode(message));
            messagesSent++;
            await TestDataFactory.delay(100);
          }
          
          // Simulate connection drop
          controller.error(new Error('Connection lost'));
        },
      });
      
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: stream,
      });
    });
    
    await chatPage.sendMessage('Test streaming');
    await page.waitForTimeout(500);
    
    // Should show partial response with error
    const partialResponse = await chatPage.getByTestId('ai-response');
    await expect(partialResponse).toContainText('Hello world');
    
    // Should show reconnection attempt
    const reconnectIndicator = await chatPage.getByTestId('reconnect-indicator');
    await expect(reconnectIndicator).toBeVisible();
  });

  test('should handle CORS errors', async ({ page }) => {
    // Mock CORS error
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await chatPage.sendMessage('Test CORS');
    
    // Should show appropriate error
    await chatPage.assertErrorMessage('Connection error');
    
    // Should not expose technical details to user
    const errorText = await chatPage.getByTestId('error-message').textContent();
    expect(errorText).not.toContain('CORS');
    expect(errorText).not.toContain('Cross-Origin');
  });

  test('should handle provider service outages', async ({ page }) => {
    // Enable multiple providers
    await settingsPage.openSettings();
    await settingsPage.setApiKey('anthropic', 'test-key');
    await settingsPage.toggleProvider('anthropic', true);
    await settingsPage.saveSettings();
    
    // Mock OpenAI down, Anthropic working
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });
    
    await chatPage.setupMocks(); // Setup other mocks
    
    await chatPage.sendMessage('Test fallback');
    await chatPage.waitForPossibilitiesPanel();
    
    // Should show error for OpenAI
    const openAIError = page.locator('[data-testid="provider-error-openai"]');
    await expect(openAIError).toBeVisible();
    
    // But should still show responses from Anthropic
    const anthropicResponse = page.locator('[data-testid="provider-response-anthropic"]');
    await expect(anthropicResponse).toBeVisible();
  });

  test('should handle memory pressure gracefully', async ({ page }) => {
    // Send many messages to increase memory usage
    for (let i = 0; i < 10; i++) {
      await chatPage.sendMessage(`Long message ${i}: ${'A'.repeat(1000)}`);
      await page.waitForTimeout(100);
    }
    
    // Check memory usage remains reasonable
    await CustomAssertions.assertMemoryUsageStable(page, 300);
    
    // Should still be responsive
    await chatPage.sendMessage('Final test message');
    await chatPage.waitForAIResponse();
  });

  test('should provide helpful troubleshooting for common errors', async ({ page }) => {
    const errorScenarios = [
      {
        status: 401,
        message: 'Invalid API key',
        suggestion: 'Check your API key in settings',
      },
      {
        status: 429,
        message: 'Rate limit',
        suggestion: 'Wait a moment or try a different provider',
      },
      {
        status: 500,
        message: 'Server error',
        suggestion: 'The service is having issues. Try again later',
      },
      {
        status: 403,
        message: 'Access denied',
        suggestion: 'Check your account permissions',
      },
    ];
    
    for (const scenario of errorScenarios) {
      // Mock error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: scenario.status,
          contentType: 'application/json',
          body: JSON.stringify({ error: scenario.message }),
        });
      });
      
      await chatPage.sendMessage('Test error');
      
      // Should show helpful suggestion
      const suggestion = await chatPage.getByTestId('error-suggestion');
      await expect(suggestion).toContainText(scenario.suggestion);
      
      // Clear error for next test
      await chatPage.dismissError();
    }
  });
});