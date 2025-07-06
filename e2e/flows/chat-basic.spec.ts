import { test, expect } from '@playwright/test';
import { ChatPage } from '../fixtures/page-objects/ChatPage';
import { SettingsPage } from '../fixtures/page-objects/SettingsPage';
import { TestDataFactory } from '../fixtures/test-data';
import { CustomAssertions } from '../fixtures/helpers/assertions';

test.describe('Basic Chat Interaction Flow', () => {
  let chatPage: ChatPage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    settingsPage = new SettingsPage(page);
    
    await chatPage.goto();
    await chatPage.cleanup();
    await chatPage.setupMocks();
    
    // Setup a test user with API keys
    const testUser = TestDataFactory.createTestUser();
    await settingsPage.openSettings();
    await settingsPage.setApiKey('openai', testUser.apiKeys.openai);
    await settingsPage.toggleProvider('openai', true);
    await settingsPage.saveSettings();
  });

  test.afterEach(async ({ page }) => {
    await chatPage.cleanup();
  });

  test('should send and receive messages', async ({ page }) => {
    // Send a message
    const testMessage = TestDataFactory.createTestMessage();
    await chatPage.sendMessage(testMessage.content);
    
    // Verify message appears in chat
    await chatPage.assertMessageInHistory(testMessage.content);
    
    // Wait for AI response
    await chatPage.waitForAIResponse();
    
    // Verify response received
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBe(2); // User message + AI response
    
    // Verify streaming completed
    await chatPage.waitForStreamingComplete();
    
    // No errors
    await CustomAssertions.assertNoConsoleErrors(page);
  });

  test('should handle message with Enter key', async ({ page }) => {
    const testMessage = TestDataFactory.createTestMessage();
    await chatPage.sendMessageWithKeyboard(testMessage.content);
    
    // Should work same as button click
    await chatPage.assertMessageInHistory(testMessage.content);
    await chatPage.waitForAIResponse();
  });

  test('should maintain conversation history', async ({ page }) => {
    // Send multiple messages
    const messages = [
      'What is the capital of France?',
      'What is its population?',
      'Tell me about its history'
    ];
    
    for (const message of messages) {
      await chatPage.sendMessage(message);
      await chatPage.waitForAIResponse();
      await chatPage.waitForStreamingComplete();
    }
    
    // Should have all messages in history
    const totalMessages = await chatPage.getMessageCount();
    expect(totalMessages).toBe(messages.length * 2); // User + AI messages
    
    // Messages should be in order
    for (const message of messages) {
      await chatPage.assertMessageInHistory(message);
    }
  });

  test('should auto-scroll to latest message', async ({ page }) => {
    // Send enough messages to require scrolling
    for (let i = 0; i < 5; i++) {
      await chatPage.sendMessage(`Test message ${i + 1}`);
      await chatPage.waitForAIResponse();
      await chatPage.waitForStreamingComplete();
    }
    
    // Should auto-scroll to bottom
    await chatPage.waitForAutoScroll();
    
    // Last message should be visible
    const lastMessage = await chatPage.getLastMessage();
    expect(lastMessage).toBeTruthy();
  });

  test('should handle empty messages', async ({ page }) => {
    // Try to send empty message
    await chatPage.typeWithoutSending('');
    
    // Send button should be disabled
    await chatPage.assertSendButtonDisabled();
    
    // Type something
    await chatPage.typeWithoutSending('Hello');
    
    // Send button should be enabled
    await chatPage.assertSendButtonEnabled();
  });

  test('should handle very long messages', async ({ page }) => {
    // Create a very long message
    const longMessage = 'A'.repeat(5000);
    await chatPage.sendMessage(longMessage);
    
    // Should handle without errors
    await chatPage.assertMessageInHistory(longMessage.substring(0, 50)); // Check first part
    await chatPage.waitForAIResponse();
  });

  test('should clear chat history', async ({ page }) => {
    // Send some messages
    await chatPage.sendMessage('First message');
    await chatPage.waitForAIResponse();
    await chatPage.sendMessage('Second message');
    await chatPage.waitForAIResponse();
    
    // Clear chat
    await chatPage.clearChat();
    
    // History should be empty
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBe(0);
    
    // Should be able to start new conversation
    await chatPage.sendMessage('New conversation');
    await chatPage.waitForAIResponse();
  });

  test('should handle rapid message sending', async ({ page }) => {
    // Send messages rapidly
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    
    for (const message of messages) {
      await chatPage.sendMessage(message);
      // Don't wait for response
    }
    
    // All messages should be queued
    for (const message of messages) {
      await chatPage.assertMessageInHistory(message);
    }
    
    // Wait for all responses
    await chatPage.waitForStreamingComplete();
    
    // Should have all responses
    const totalMessages = await chatPage.getMessageCount();
    expect(totalMessages).toBeGreaterThanOrEqual(messages.length * 2);
  });

  test('should preserve formatting in messages', async ({ page }) => {
    const formattedMessage = `Here's some code:
\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

And a list:
- Item 1
- Item 2
- Item 3`;
    
    await chatPage.sendMessage(formattedMessage);
    await chatPage.assertMessageInHistory('def hello():');
    await chatPage.assertMessageInHistory('Item 1');
    
    // Code blocks should be formatted
    const codeBlock = page.locator('pre code');
    await expect(codeBlock).toBeVisible();
  });

  test('should handle special characters', async ({ page }) => {
    const specialMessage = 'Test émojis 🎉🚀 and symbols: <>&"\'`@#$%^&*()';
    
    await chatPage.sendMessage(specialMessage);
    await chatPage.assertMessageInHistory('🎉🚀');
    await chatPage.assertMessageInHistory('<>&');
    
    // Should not cause XSS
    await CustomAssertions.assertNoConsoleErrors(page);
  });

  test('should show typing indicator', async ({ page }) => {
    await chatPage.sendMessage('Hello AI');
    
    // Should show typing indicator immediately
    const typingIndicator = await chatPage.getByTestId('typing-indicator');
    await expect(typingIndicator).toBeVisible();
    
    // Should hide when response complete
    await chatPage.waitForStreamingComplete();
    await expect(typingIndicator).not.toBeVisible();
  });

  test('should handle network interruption gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);
    
    // Try to send message
    await chatPage.sendMessage('Test message');
    
    // Should show error
    await chatPage.assertErrorMessage('Network error');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should allow retry
    const retryButton = await chatPage.getByTestId('retry-message');
    await retryButton.click();
    
    // Should work now
    await chatPage.waitForAIResponse();
  });

  test('should persist chat across page reload', async ({ page }) => {
    // Send messages
    await chatPage.sendMessage('Remember this message');
    await chatPage.waitForAIResponse();
    
    const messageCountBefore = await chatPage.getMessageCount();
    
    // Reload page
    await page.reload();
    
    // Messages should still be there
    const messageCountAfter = await chatPage.getMessageCount();
    expect(messageCountAfter).toBe(messageCountBefore);
    
    await chatPage.assertMessageInHistory('Remember this message');
  });

  test('should handle concurrent chats in multiple tabs', async ({ browser }) => {
    // Create two pages
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    const chatPage1 = new ChatPage(page1);
    const chatPage2 = new ChatPage(page2);
    
    // Setup both pages
    await chatPage1.goto();
    await chatPage1.setupMocks();
    await chatPage2.goto();
    await chatPage2.setupMocks();
    
    // Send messages from both tabs
    await chatPage1.sendMessage('Message from tab 1');
    await chatPage2.sendMessage('Message from tab 2');
    
    // Both should work independently
    await chatPage1.waitForAIResponse();
    await chatPage2.waitForAIResponse();
    
    // Cleanup
    await context.close();
  });

  test('should respect message input focus', async ({ page }) => {
    await chatPage.goto();
    
    // Input should be focused by default
    await chatPage.assertInputFocused();
    
    // After sending message
    await chatPage.sendMessage('Test');
    await chatPage.waitForAIResponse();
    
    // Input should regain focus
    await chatPage.assertInputFocused();
  });
});