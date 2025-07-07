import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { CustomAssertions } from '../helpers/assertions';

export class ChatPage extends BasePage {
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;
  readonly possibilitiesPanel: Locator;
  readonly newChatButton: Locator;

  constructor(page: Page) {
    super(page);
    this.messageInput = page.locator('[data-testid="message-input"]');
    this.sendButton = page.locator('[data-testid="send-button"]');
    this.messagesContainer = page.locator('[data-testid="messages-container"]');
    this.possibilitiesPanel = page.locator('[data-testid="possibilities-panel"]');
    this.newChatButton = page.locator('[data-testid="new-chat-button"]');
  }

  async sendMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.sendButton.click();
    await this.waitForMessageSent();
  }

  async sendMessageWithKeyboard(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.messageInput.press('Enter');
    await this.waitForMessageSent();
  }

  async waitForMessageSent(): Promise<void> {
    await expect(this.messageInput).toHaveValue('');
    await this.page.waitForFunction(() => {
      const messages = document.querySelectorAll('[data-testid^="message-"]');
      return messages.length > 0;
    });
  }

  async waitForAIResponse(): Promise<void> {
    await this.page.waitForSelector('[data-testid="ai-response"]', {
      state: 'visible',
      timeout: 10000
    });
  }

  async waitForSystemReady(): Promise<void> {
    // Wait for the message input to be enabled (system ready)
    await expect(this.messageInput).toBeEnabled({ timeout: 15000 });
    
    // Additional check: wait for placeholder to change from "Configure API keys..."
    await expect(this.messageInput).not.toHaveAttribute('placeholder', 'Configure API keys in settings...');
    
    // Wait for the warning banner to disappear
    const warningBanner = this.page.locator('text="Configure API keys in the settings menu"');
    await expect(warningBanner).not.toBeVisible();
  }

  async waitForStreamingComplete(): Promise<void> {
    await this.page.waitForFunction(() => {
      const streamingIndicators = document.querySelectorAll('[data-testid^="streaming-"]');
      return streamingIndicators.length === 0;
    }, { timeout: 30000 });
  }

  async getLastMessage(): Promise<string> {
    const messages = await this.page.locator('[data-testid^="message-"]').all();
    if (messages.length === 0) return '';
    const lastMessage = messages[messages.length - 1];
    return await lastMessage.textContent() || '';
  }

  async getMessageCount(): Promise<number> {
    return await this.page.locator('[data-testid^="message-"]').count();
  }

  async clearChat(): Promise<void> {
    await this.newChatButton.click();
    await this.page.waitForFunction(() => {
      const messages = document.querySelectorAll('[data-testid^="message-"]');
      return messages.length === 0;
    });
  }

  async isPossibilitiesPanelVisible(): Promise<boolean> {
    return await this.possibilitiesPanel.isVisible();
  }

  async waitForPossibilitiesPanel(): Promise<void> {
    await CustomAssertions.assertElementVisible(this.possibilitiesPanel);
  }

  async getPossibilityCount(): Promise<number> {
    await this.waitForPossibilitiesPanel();
    return await this.page.locator('[data-testid^="possibility-item-"]').count();
  }

  async clickPossibility(index: number): Promise<void> {
    const possibility = this.page.locator(`[data-testid="possibility-item-${index}"]`);
    await possibility.click();
  }

  async copyPossibilityResponse(index: number): Promise<void> {
    const copyButton = this.page.locator(`[data-testid="copy-possibility-${index}"]`);
    await copyButton.click();
    
    // Verify copy success
    const notification = this.page.locator('[data-testid="copy-notification"]');
    await expect(notification).toBeVisible();
    await expect(notification).toHaveText('Copied to clipboard');
  }

  async scrollPossibilitiesPanel(): Promise<void> {
    await this.possibilitiesPanel.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
  }

  async assertVirtualScrolling(): Promise<void> {
    await CustomAssertions.assertVirtualScrollingActive(this.page);
  }

  async assertStreamingActive(possibilityId: string): Promise<void> {
    await CustomAssertions.assertStreamingStarted(this.page, possibilityId);
  }

  async assertStreamingComplete(possibilityId: string): Promise<void> {
    await CustomAssertions.assertStreamingCompleted(this.page, possibilityId);
  }

  async assertConnectionLimit(): Promise<void> {
    await CustomAssertions.assertConnectionCount(this.page, 6);
  }

  async typeWithoutSending(message: string): Promise<void> {
    await this.messageInput.fill(message);
  }

  async assertInputFocused(): Promise<void> {
    await expect(this.messageInput).toBeFocused();
  }

  async assertSendButtonEnabled(): Promise<void> {
    await expect(this.sendButton).toBeEnabled();
  }

  async assertSendButtonDisabled(): Promise<void> {
    await expect(this.sendButton).toBeDisabled();
  }

  async assertMessageInHistory(message: string): Promise<void> {
    const messageElement = this.page.locator(`[data-testid^="message-"]:has-text("${message}")`);
    await expect(messageElement).toBeVisible();
  }

  async assertErrorMessage(errorText: string): Promise<void> {
    const errorElement = this.page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(errorText);
  }

  async dismissError(): Promise<void> {
    const dismissButton = this.page.locator('[data-testid="dismiss-error"]');
    await dismissButton.click();
    await expect(dismissButton).not.toBeVisible();
  }

  async waitForAutoScroll(): Promise<void> {
    await this.page.waitForFunction(() => {
      const container = document.querySelector('[data-testid="messages-container"]');
      if (!container) return false;
      return Math.abs(container.scrollHeight - container.scrollTop - container.clientHeight) < 1;
    });
  }

  async togglePossibilitiesPanel(): Promise<void> {
    const toggleButton = this.page.locator('[data-testid="toggle-possibilities"]');
    await toggleButton.click();
  }

  async assertPossibilityPriority(): Promise<void> {
    await CustomAssertions.assertPriorityQueueOrder(this.page);
  }
}