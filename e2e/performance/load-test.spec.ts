import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Performance Under Load Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
    
    // Setup multiple providers for load testing
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    
    const providers = ['openai', 'anthropic', 'google', 'mistral'];
    for (const provider of providers) {
      await settingsPage.setApiKey(provider, testUser.apiKeys[provider]);
      await settingsPage.toggleProvider(provider, true);
    }
    
    await settingsPage.saveSettings();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should handle 6 concurrent streaming connections', async ({ page }) => {
    // Monitor network requests
    const activeConnections = new Set();
    
    page.on('request', request => {
      if (request.url().includes('/api/possibility/')) {
        activeConnections.add(request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/possibility/')) {
        activeConnections.delete(response.url());
      }
    });
    
    // Send message to trigger many possibilities
    await chatPage.sendMessage('What is the meaning of life?');
    await chatPage.waitForPossibilitiesPanel();
    
    // Monitor active connections
    await page.waitForTimeout(1000);
    
    // Should respect connection limit
    expect(activeConnections.size).toBeLessThanOrEqual(6);
    
    // Wait for completion
    await chatPage.waitForStreamingComplete();
    
    // All connections should be closed
    await page.waitForTimeout(1000);
    expect(activeConnections.size).toBe(0);
  });

  test('should handle rapid message sending', async ({ page }) => {
    const startTime = Date.now();
    const messages = [];
    
    // Send 20 messages rapidly
    for (let i = 0; i < 20; i++) {
      const message = `Rapid message ${i + 1}`;
      messages.push(message);
      await chatPage.sendMessage(message);
      
      // Don't wait for responses
      await page.waitForTimeout(50);
    }
    
    const sendTime = Date.now() - startTime;
    expect(sendTime).toBeLessThan(5000); // Should send all quickly
    
    // All messages should be queued
    for (const message of messages) {
      await chatPage.assertMessageInHistory(message);
    }
    
    // Should handle queue gracefully
    const queueIndicator = await chatPage.getByTestId('queue-indicator');
    if (await queueIndicator.isVisible()) {
      await expect(queueIndicator).toBeVisible();
    }
    
    // Eventually all should complete
    await chatPage.waitForStreamingComplete();
    
    // Check memory usage
    await CustomAssertions.assertMemoryUsageStable(page);
  });

  test('should handle long conversation history', async ({ page }) => {
    // Create long conversation
    for (let i = 0; i < 50; i++) {
      await chatPage.sendMessage(`Message ${i + 1}: ${TestDataFactory.generateTestId()}`);
      await chatPage.waitForAIResponse();
      await page.waitForTimeout(100);
    }
    
    // Should still be responsive
    const responseTime = await page.evaluate(() => {
      const start = performance.now();
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          resolve(performance.now() - start);
        });
      });
    });
    
    expect(responseTime).toBeLessThan(100); // Should remain responsive
    
    // Virtual scrolling should handle large list
    await chatPage.assertVirtualScrolling();
    
    // Memory usage should be reasonable
    await CustomAssertions.assertMemoryUsageStable(page);
  });

  test('should handle multiple tabs with concurrent usage', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    const chatPages = pages.map(page => new ChatPage(page));
    
    // Setup all pages
    for (const [index, page] of pages.entries()) {
      await chatPages[index].goto();
      await chatPages[index].setupMocks();
    }
    
    // Send messages from all tabs simultaneously
    const messagePromises = chatPages.map((chatPage, index) => 
      chatPage.sendMessage(`Message from tab ${index + 1}`)
    );
    
    await Promise.all(messagePromises);
    
    // All should work independently
    const responsePromises = chatPages.map(chatPage => 
      chatPage.waitForAIResponse()
    );
    
    await Promise.all(responsePromises);
    
    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should handle stress testing with many possibilities', async ({ page }) => {
    // Mock many models to create stress
    const modelCount = 20;
    
    for (let i = 0; i < modelCount; i++) {
      await page.route(`**/api/possibility/${i}`, route => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            for (let j = 0; j < 100; j++) {
              controller.enqueue(encoder.encode(`data: {"token": "Token ${j} "}\n\n`));
              await TestDataFactory.delay(10);
            }
            controller.enqueue(encoder.encode('data: {"done": true}\n\n'));
            controller.close();
          },
        });
        
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: stream,
        });
      });
    }
    
    await chatPage.sendMessage('Stress test');
    await chatPage.waitForPossibilitiesPanel();
    
    // Should handle many possibilities without crashing
    await page.waitForTimeout(2000);
    
    // Should maintain performance
    await CustomAssertions.assertMemoryUsageStable(page, 500);
    
    // Should respect connection limit
    await chatPage.assertConnectionLimit();
  });

  test('should handle memory pressure scenarios', async ({ page }) => {
    // Create memory pressure by sending many large messages
    const largeMessage = 'A'.repeat(10000);
    
    for (let i = 0; i < 20; i++) {
      await chatPage.sendMessage(`${largeMessage} - Message ${i + 1}`);
      await page.waitForTimeout(200);
    }
    
    // Should handle gracefully
    await CustomAssertions.assertMemoryUsageStable(page, 400);
    
    // Should still be responsive
    await chatPage.sendMessage('Final test');
    await chatPage.waitForAIResponse();
  });

  test('should handle WebSocket connection pooling', async ({ page }) => {
    // Track WebSocket connections
    const wsConnections = new Set();
    
    page.on('websocket', ws => {
      wsConnections.add(ws);
      ws.on('close', () => wsConnections.delete(ws));
    });
    
    // Send multiple messages
    for (let i = 0; i < 10; i++) {
      await chatPage.sendMessage(`WebSocket test ${i + 1}`);
      await page.waitForTimeout(100);
    }
    
    // Should pool connections efficiently
    await page.waitForTimeout(1000);
    expect(wsConnections.size).toBeLessThanOrEqual(6);
  });

  test('should handle prolonged session', async ({ page }) => {
    const sessionStart = Date.now();
    const sessionDuration = 30000; // 30 seconds
    
    // Simulate prolonged usage
    while (Date.now() - sessionStart < sessionDuration) {
      await chatPage.sendMessage(`Session message ${Date.now()}`);
      await page.waitForTimeout(2000);
      
      // Check memory periodically
      if ((Date.now() - sessionStart) % 10000 === 0) {
        await CustomAssertions.assertMemoryUsageStable(page);
      }
    }
    
    // Should still be responsive after prolonged use
    await chatPage.sendMessage('Final session test');
    await chatPage.waitForAIResponse();
  });

  test('should handle network throttling gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', async route => {
      await TestDataFactory.delay(2000); // 2 second delay
      route.continue();
    });
    
    const startTime = Date.now();
    await chatPage.sendMessage('Throttled message');
    
    // Should show loading indicators
    const loadingIndicator = await chatPage.getByTestId('loading-indicator');
    await expect(loadingIndicator).toBeVisible();
    
    // Should handle timeout gracefully
    await page.waitForTimeout(5000);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should respect reasonable timeout
    expect(totalTime).toBeLessThan(10000);
  });

  test('should handle priority queue under load', async ({ page }) => {
    // Send many messages with different priorities
    const messages = [
      { text: 'High priority GPT-4', priority: 'high' },
      { text: 'Standard message', priority: 'normal' },
      { text: 'Low priority model', priority: 'low' },
    ];
    
    for (let i = 0; i < 10; i++) {
      for (const message of messages) {
        await chatPage.sendMessage(`${message.text} ${i + 1}`);
        await page.waitForTimeout(50);
      }
    }
    
    // Should handle priority correctly
    await chatPage.assertPossibilityPriority();
    
    // Should complete all requests
    await chatPage.waitForStreamingComplete();
  });

  test('should handle connection drops and reconnection', async ({ page }) => {
    // Start conversation
    await chatPage.sendMessage('Connection test');
    await chatPage.waitForPossibilitiesPanel();
    
    // Simulate connection drop
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    
    // Try to send message (should queue)
    await chatPage.sendMessage('Queued message');
    
    // Reconnect
    await page.context().setOffline(false);
    await chatPage.setupMocks();
    
    // Should process queued messages
    await page.waitForTimeout(2000);
    await chatPage.waitForAIResponse();
  });

  test('should handle CPU intensive operations', async ({ page }) => {
    // Simulate CPU intensive work
    await page.evaluate(() => {
      // Simulate heavy computation
      const worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(e) {
          let result = 0;
          for (let i = 0; i < 1000000; i++) {
            result += Math.random();
          }
          self.postMessage(result);
        };
      `], { type: 'application/javascript' })));
      
      worker.postMessage('start');
      worker.onmessage = () => worker.terminate();
    });
    
    // Should remain responsive during CPU work
    await chatPage.sendMessage('CPU test');
    await chatPage.waitForAIResponse();
    
    // Performance should not degrade significantly
    const performanceMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory?.usedJSHeapSize,
        timing: performance.timing.loadEventEnd - performance.timing.navigationStart,
      };
    });
    
    expect(performanceMetrics.memory).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});