import { Page, Locator } from '@playwright/test';
import { CustomAssertions } from '../helpers/assertions';
import { TestCleanup } from '../helpers/cleanup';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await CustomAssertions.assertPageLoaded(this.page);
    // Wait for auth session to be loaded
    await this.waitForAuthSession();
  }

  async waitForAuthSession(): Promise<void> {
    // Wait for NextAuth session to be established (with our mock)
    await this.page.waitForFunction(() => {
      // Check if there's a session in the page context
      return document.querySelector('[data-testid="message-input"]') !== null;
    }, { timeout: 10000 });
    
    // Additional wait to ensure any auth popups have time to appear and be dismissed
    await this.page.waitForTimeout(1000);
  }

  async waitForLoadComplete(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  async clickByTestId(testId: string): Promise<void> {
    await this.getByTestId(testId).click();
  }

  async fillByTestId(testId: string, value: string): Promise<void> {
    await this.getByTestId(testId).fill(value);
  }

  async selectByTestId(testId: string, value: string): Promise<void> {
    await this.getByTestId(testId).selectOption(value);
  }

  async waitForTestId(testId: string, options?: { timeout?: number }): Promise<void> {
    await this.getByTestId(testId).waitFor({ state: 'visible', ...options });
  }

  async cleanup(): Promise<void> {
    await this.closeAnyOpenModals();
    await TestCleanup.cleanAllTestData(this.page);
  }

  async closeAnyOpenModals(): Promise<void> {
    // Close settings modal if open
    const settingsModal = this.page.locator('[data-testid="settings-modal"]');
    if (await settingsModal.isVisible()) {
      const closeButton = this.page.locator('[data-testid="close-settings"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await settingsModal.waitFor({ state: 'hidden' });
      }
    }

    // Press Escape to close any other modals
    await this.page.keyboard.press('Escape');
    
    // Wait a moment for any modal animations to complete
    await this.page.waitForTimeout(100);
  }

  async setupMocks(): Promise<void> {
    await TestCleanup.interceptAndMockAPIs(this.page);
    await TestCleanup.mockStreamingResponses(this.page);
  }

  async isMobile(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(({ k, v }) => {
      localStorage.setItem(k, v);
    }, { k: key, v: value });
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  async reloadPage(): Promise<void> {
    await this.page.reload();
    await this.waitForLoadComplete();
  }

  async assertNoErrors(): Promise<void> {
    await CustomAssertions.assertNoConsoleErrors(this.page);
  }
}