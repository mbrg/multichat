import { expect, Page, Locator } from '@playwright/test';

export class CustomAssertions {
  static async assertNoConsoleErrors(page: Page): Promise<void> {
    const consoleMessages: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    // Give page time to potentially log errors
    await page.waitForTimeout(100);
    
    expect(consoleMessages).toHaveLength(0);
  }

  static async assertPageLoaded(page: Page, timeout = 5000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
    await this.assertNoConsoleErrors(page);
  }

  static async assertElementVisible(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  static async assertTextContent(
    locator: Locator, 
    expectedText: string | RegExp,
    timeout = 5000
  ): Promise<void> {
    if (typeof expectedText === 'string') {
      await expect(locator).toHaveText(expectedText, { timeout });
    } else {
      await expect(locator).toHaveText(expectedText, { timeout });
    }
  }

  static async assertStreamingStarted(page: Page, possibilityId: string): Promise<void> {
    const streamingIndicator = page.locator(`[data-testid="streaming-${possibilityId}"]`);
    await expect(streamingIndicator).toBeVisible({ timeout: 3000 });
  }

  static async assertStreamingCompleted(page: Page, possibilityId: string): Promise<void> {
    const streamingIndicator = page.locator(`[data-testid="streaming-${possibilityId}"]`);
    await expect(streamingIndicator).not.toBeVisible({ timeout: 10000 });
  }

  static async assertApiKeyEncrypted(page: Page, storageKey: string): Promise<void> {
    const value = await page.evaluate((key) => localStorage.getItem(key), storageKey);
    
    expect(value).not.toBeNull();
    expect(value).not.toContain('sk-'); // Should not contain plain API key prefix
    expect(value).toMatch(/^[A-Za-z0-9+/]+=*$/); // Should be base64 encoded
  }

  static async assertConnectionCount(page: Page, expectedCount: number): Promise<void> {
    const activeConnections = await page.evaluate(() => {
      // Access the connection pool service if exposed globally
      return (window as any).__connectionPool?.getActiveConnectionCount() || 0;
    });
    
    expect(activeConnections).toBeLessThanOrEqual(expectedCount);
  }

  static async assertVirtualScrollingActive(page: Page): Promise<void> {
    const virtualList = page.locator('[data-testid="virtual-possibilities-list"]');
    await expect(virtualList).toBeVisible();
    
    // Check that only visible items are rendered
    const visibleItems = await page.locator('[data-testid^="possibility-item-"]').count();
    expect(visibleItems).toBeLessThan(20); // Should use virtual scrolling for large lists
  }

  static async assertPriorityQueueOrder(page: Page): Promise<void> {
    const queueItems = await page.locator('[data-testid^="queue-item-"]').all();
    const priorities = await Promise.all(
      queueItems.map(item => item.getAttribute('data-priority'))
    );
    
    // Verify high priority items come first
    let lastPriority = Infinity;
    for (const priority of priorities) {
      const currentPriority = parseInt(priority || '0');
      expect(currentPriority).toBeLessThanOrEqual(lastPriority);
      lastPriority = currentPriority;
    }
  }

  static async assertCircuitBreakerStatus(
    page: Page, 
    provider: string, 
    expectedStatus: 'closed' | 'open' | 'half-open'
  ): Promise<void> {
    const status = await page.evaluate((providerName) => {
      return (window as any).__circuitBreakers?.[providerName]?.getState() || 'unknown';
    }, provider);
    
    expect(status).toBe(expectedStatus);
  }

  static async assertMemoryUsageStable(page: Page, maxMB = 200): Promise<void> {
    if ('memory' in performance) {
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory;
      });
      
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      expect(usedMB).toBeLessThan(maxMB);
    }
  }

  static async assertAccessibility(page: Page): Promise<void> {
    const violations = await page.evaluate(() => {
      // Basic accessibility checks
      const issues: string[] = [];
      
      // Check for alt text on images
      const images = document.querySelectorAll('img:not([alt])');
      if (images.length > 0) {
        issues.push(`${images.length} images without alt text`);
      }
      
      // Check for proper heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      headings.forEach(h => {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1) {
          issues.push(`Heading hierarchy broken at ${h.tagName}`);
        }
        lastLevel = level;
      });
      
      // Check for proper ARIA labels on interactive elements
      const buttons = document.querySelectorAll('button:not([aria-label]):not(:has(*))');
      if (buttons.length > 0) {
        issues.push(`${buttons.length} buttons without accessible labels`);
      }
      
      return issues;
    });
    
    expect(violations).toHaveLength(0);
  }
}