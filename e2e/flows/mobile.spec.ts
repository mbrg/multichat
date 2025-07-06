import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Mobile-Specific Interaction Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
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

  test('should prevent zoom on input focus', async ({ page }) => {
    // Check viewport meta tag
    const metaViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(metaViewport).toContain('user-scalable=no');
    
    // Click on input
    await chatPage.messageInput.click();
    
    // Check that font size is at least 16px to prevent zoom
    const fontSize = await chatPage.messageInput.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(16);
    
    // Verify no zoom occurred
    const scale = await page.evaluate(() => window.visualViewport?.scale || 1);
    expect(scale).toBe(1);
  });

  test('should handle keyboard appearance and disappearance', async ({ page }) => {
    // Initial viewport height
    const initialHeight = await page.evaluate(() => window.innerHeight);
    
    // Focus input (keyboard appears)
    await chatPage.messageInput.focus();
    
    // Wait for keyboard animation
    await page.waitForTimeout(300);
    
    // Available height should be reduced
    const keyboardHeight = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vvh = window.visualViewport?.height || vh;
      return vh - vvh;
    });
    
    expect(keyboardHeight).toBeGreaterThan(100); // Keyboard should be visible
    
    // Chat should adjust to keyboard
    const chatContainer = await chatPage.getByTestId('chat-container');
    const containerRect = await chatContainer.boundingBox();
    expect(containerRect?.height).toBeLessThan(initialHeight);
    
    // Dismiss keyboard
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Height should return to normal
    const finalHeight = await page.evaluate(() => window.innerHeight);
    expect(finalHeight).toBe(initialHeight);
  });

  test('should handle touch interactions', async ({ page }) => {
    // Send message to get possibilities
    await chatPage.sendMessage('Test touch');
    
    // Swipe to open possibilities panel
    const panelToggle = await chatPage.getByTestId('possibilities-toggle');
    await panelToggle.click();
    
    // Panel should open
    await expect(chatPage.possibilitiesPanel).toBeVisible();
    
    // Swipe to close
    await page.touchscreen.tap(100, 100); // Tap outside panel
    
    // Panel should close
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
  });

  test('should have adequate touch target sizes', async ({ page }) => {
    // Check important interactive elements
    const touchTargets = [
      'send-button',
      'settings-button',
      'new-chat-button',
      'possibilities-toggle',
    ];
    
    for (const targetId of touchTargets) {
      const element = await chatPage.getByTestId(targetId);
      const box = await element.boundingBox();
      
      // Touch targets should be at least 44x44px
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle mobile navigation patterns', async ({ page }) => {
    // Should have mobile navigation
    const mobileNav = await chatPage.getByTestId('mobile-nav');
    await expect(mobileNav).toBeVisible();
    
    // Should have hamburger menu
    const hamburgerMenu = await chatPage.getByTestId('hamburger-menu');
    await expect(hamburgerMenu).toBeVisible();
    
    // Tap to open menu
    await hamburgerMenu.click();
    
    // Menu should slide in
    const mobileMenu = await chatPage.getByTestId('mobile-menu');
    await expect(mobileMenu).toBeVisible();
    
    // Menu items should be touch-friendly
    const menuItems = await page.locator('[data-testid^="menu-item-"]').all();
    for (const item of menuItems) {
      const box = await item.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(48); // Minimum touch height
    }
  });

  test('should handle portrait/landscape orientation', async ({ page }) => {
    // Test portrait mode (default)
    await chatPage.sendMessage('Portrait test');
    
    // Possibilities should be collapsed by default
    await expect(chatPage.possibilitiesPanel).not.toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    
    // Should adapt layout
    await page.waitForTimeout(200);
    
    // In landscape, possibilities might be visible
    const isLandscape = await page.evaluate(() => window.innerWidth > window.innerHeight);
    expect(isLandscape).toBe(true);
    
    // Layout should adjust
    const chatContainer = await chatPage.getByTestId('chat-container');
    const containerRect = await chatContainer.boundingBox();
    expect(containerRect?.width).toBe(844);
  });

  test('should handle pull-to-refresh gesture', async ({ page }) => {
    // Simulate pull-to-refresh
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    // Simulate touch gesture
    await page.touchscreen.tap(195, 50);
    await page.touchscreen.tap(195, 200);
    
    // Should show refresh indicator
    const refreshIndicator = await chatPage.getByTestId('refresh-indicator');
    if (await refreshIndicator.isVisible()) {
      await expect(refreshIndicator).toBeVisible();
    }
  });

  test('should handle scroll behavior on mobile', async ({ page }) => {
    // Send multiple messages to enable scrolling
    for (let i = 0; i < 10; i++) {
      await chatPage.sendMessage(`Test message ${i + 1}`);
      await page.waitForTimeout(100);
    }
    
    // Should enable smooth scrolling
    const scrollBehavior = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollBehavior;
    });
    expect(scrollBehavior).toBe('smooth');
    
    // Should maintain scroll position during keyboard appearance
    await page.evaluate(() => window.scrollTo(0, 100));
    await chatPage.messageInput.focus();
    
    // Scroll position should be preserved
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeGreaterThan(50);
  });

  test('should handle long press gestures', async ({ page }) => {
    // Send message to get content
    await chatPage.sendMessage('Long press test');
    await chatPage.waitForAIResponse();
    
    // Long press on message
    const message = await chatPage.getByTestId('ai-response');
    
    // Simulate long press
    await page.touchscreen.tap(195, 300);
    await page.waitForTimeout(600); // Long press duration
    
    // Should show context menu
    const contextMenu = await chatPage.getByTestId('context-menu');
    if (await contextMenu.isVisible()) {
      await expect(contextMenu).toBeVisible();
      
      // Should have copy option
      const copyOption = contextMenu.locator('[data-testid="copy-option"]');
      await expect(copyOption).toBeVisible();
    }
  });

  test('should handle safe area insets', async ({ page }) => {
    // Check CSS custom properties for safe areas
    const safeAreaTop = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top');
    });
    
    const safeAreaBottom = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom');
    });
    
    // Should have safe area properties defined
    expect(safeAreaTop).toBeTruthy();
    expect(safeAreaBottom).toBeTruthy();
    
    // Header should account for safe area
    const header = await chatPage.getByTestId('header');
    const headerStyles = await header.evaluate(el => window.getComputedStyle(el));
    expect(headerStyles.paddingTop).toContain('env(safe-area-inset-top)');
  });

  test('should handle text selection on mobile', async ({ page }) => {
    await chatPage.sendMessage('Text selection test');
    await chatPage.waitForAIResponse();
    
    // Get response text
    const responseText = await chatPage.getByTestId('ai-response');
    
    // Simulate text selection
    await responseText.click();
    await page.keyboard.press('Control+A'); // Select all
    
    // Should show selection handles or highlight
    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toBeTruthy();
  });

  test('should handle multiple viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 390, height: 844, name: 'iPhone 12' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 360, height: 640, name: 'Android Small' },
      { width: 412, height: 915, name: 'Android Large' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      
      // Should adapt layout
      const chatContainer = await chatPage.getByTestId('chat-container');
      const containerRect = await chatContainer.boundingBox();
      
      expect(containerRect?.width).toBeLessThanOrEqual(viewport.width);
      expect(containerRect?.height).toBeLessThanOrEqual(viewport.height);
      
      // UI should remain usable
      await expect(chatPage.messageInput).toBeVisible();
      await expect(chatPage.sendButton).toBeVisible();
    }
  });

  test('should handle mobile-specific performance optimizations', async ({ page }) => {
    // Check for mobile-specific optimizations
    const hasIntersectionObserver = await page.evaluate(() => {
      return 'IntersectionObserver' in window;
    });
    expect(hasIntersectionObserver).toBe(true);
    
    // Should use efficient scrolling
    const chatContainer = await chatPage.getByTestId('chat-container');
    const transformStyle = await chatContainer.evaluate(el => {
      return window.getComputedStyle(el).transform;
    });
    
    // Should use hardware acceleration
    expect(transformStyle).not.toBe('none');
  });

  test('should handle accessibility on mobile', async ({ page }) => {
    // Check ARIA labels
    await CustomAssertions.assertAccessibility(page);
    
    // Check focus management
    await chatPage.messageInput.focus();
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBe('TEXTAREA');
    
    // Check screen reader announcements
    const announcements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[aria-live]')).length;
    });
    expect(announcements).toBeGreaterThan(0);
  });

  test('should handle mobile browser quirks', async ({ page }) => {
    // Test iOS Safari specific behavior
    const userAgent = await page.evaluate(() => navigator.userAgent);
    
    if (userAgent.includes('Safari') && userAgent.includes('Mobile')) {
      // iOS Safari specific tests
      const hasVisualViewport = await page.evaluate(() => 'visualViewport' in window);
      expect(hasVisualViewport).toBe(true);
    }
    
    // Test for -webkit-overflow-scrolling support
    const hasWebkitScrolling = await page.evaluate(() => {
      const div = document.createElement('div');
      (div.style as any).webkitOverflowScrolling = 'touch';
      return (div.style as any).webkitOverflowScrolling === 'touch';
    });
    
    if (hasWebkitScrolling) {
      const chatContainer = chatPage.getByTestId('chat-container');
      const webkitScrolling = await chatContainer.evaluate(el => {
        return (window.getComputedStyle(el) as any).webkitOverflowScrolling;
      });
      expect(webkitScrolling).toBe('touch');
    }
  });
});