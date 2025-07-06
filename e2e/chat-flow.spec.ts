/**
 * Chat Flow E2E Tests
 * 
 * Tests the critical user flow of multi-AI chat generation
 * Following Dave Farley's principles of comprehensive E2E coverage
 */

import { test, expect } from '@playwright/test'

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for the app to be fully loaded
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
  })

  test('should load the main chat interface', async ({ page }) => {
    // Check that main components are visible
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="possibilities-panel"]')).toBeVisible()
  })

  test('should send a message and generate possibilities', async ({ page }) => {
    // Type a message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('What is artificial intelligence?')
    
    // Send the message
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for message to appear in chat
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('What is artificial intelligence?')
    
    // Wait for possibilities to start generating
    await expect(page.locator('[data-testid="possibility-item"]').first()).toBeVisible({ timeout: 30000 })
    
    // Check that multiple possibilities are generated
    const possibilities = page.locator('[data-testid="possibility-item"]')
    await expect(possibilities).toHaveCount(30) // Default possibility count
  })

  test('should stream tokens in real-time', async ({ page }) => {
    // Send a message
    await page.locator('[data-testid="message-input"]').fill('Tell me a short story')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for first possibility to start streaming
    const firstPossibility = page.locator('[data-testid="possibility-item"]').first()
    await expect(firstPossibility).toBeVisible({ timeout: 30000 })
    
    // Wait for content to start appearing (streaming)
    const possibilityContent = firstPossibility.locator('[data-testid="possibility-content"]')
    await expect(possibilityContent).not.toBeEmpty({ timeout: 10000 })
    
    // Wait a bit more and check that content has grown (streaming in progress)
    await page.waitForTimeout(2000)
    const initialLength = (await possibilityContent.textContent())?.length || 0
    
    await page.waitForTimeout(3000)
    const finalLength = (await possibilityContent.textContent())?.length || 0
    
    expect(finalLength).toBeGreaterThan(initialLength)
  })

  test('should handle API key configuration', async ({ page }) => {
    // Open settings
    await page.locator('[data-testid="settings-button"]').click()
    
    // Navigate to API Keys section
    await page.locator('[data-testid="api-keys-tab"]').click()
    
    // Check that API key forms are visible
    await expect(page.locator('[data-testid="openai-api-key-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="anthropic-api-key-form"]')).toBeVisible()
    
    // Test OpenAI API key input
    const openaiKeyInput = page.locator('[data-testid="openai-api-key-input"]')
    await openaiKeyInput.fill('test-openai-key')
    
    // Save API key
    await page.locator('[data-testid="save-openai-key"]').click()
    
    // Check for success message or validation
    await expect(page.locator('[data-testid="api-key-success"]')).toBeVisible({ timeout: 5000 })
  })

  test('should configure generation settings', async ({ page }) => {
    // Open settings
    await page.locator('[data-testid="settings-button"]').click()
    
    // Navigate to Generation Settings
    await page.locator('[data-testid="generation-settings-tab"]').click()
    
    // Test model selection
    const gpt4Checkbox = page.locator('[data-testid="model-gpt-4"]')
    await gpt4Checkbox.check()
    await expect(gpt4Checkbox).toBeChecked()
    
    // Test temperature adjustment
    const temperatureSlider = page.locator('[data-testid="temperature-slider"]')
    await temperatureSlider.fill('0.8')
    
    // Save settings
    await page.locator('[data-testid="save-settings"]').click()
    
    // Verify settings are saved
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Mock a network error by intercepting API calls
    await page.route('**/api/chat/completions', route => {
      route.abort('failed')
    })
    
    // Try to send a message
    await page.locator('[data-testid="message-input"]').fill('Test message')
    await page.locator('[data-testid="send-button"]').click()
    
    // Check for error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="error-message"]')).toContainText('generation failed')
  })

  test('should support conversation persistence', async ({ page }) => {
    // Send a message
    await page.locator('[data-testid="message-input"]').fill('Hello, remember this message')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for message to be saved
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Hello, remember this message')
    
    // Reload the page
    await page.reload()
    
    // Check that message is still there
    await expect(page.locator('[data-testid="user-message"]')).toContainText('Hello, remember this message')
  })

  test('should cancel generation', async ({ page }) => {
    // Send a message to start generation
    await page.locator('[data-testid="message-input"]').fill('Generate a long response')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for generation to start
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('Generating')
    
    // Cancel generation
    await page.locator('[data-testid="cancel-generation"]').click()
    
    // Check that generation is cancelled
    await expect(page.locator('[data-testid="generation-status"]')).toContainText('Cancelled')
  })
})

test.describe('Mobile Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size
  
  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/')
    
    // Check mobile layout
    await expect(page.locator('[data-testid="mobile-chat-container"]')).toBeVisible()
    
    // Test message input on mobile
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Mobile test message')
    
    // Ensure keyboard doesn't zoom on iOS
    const inputFontSize = await messageInput.evaluate(el => 
      window.getComputedStyle(el).fontSize
    )
    expect(parseFloat(inputFontSize)).toBeGreaterThanOrEqual(16) // Prevents zoom
    
    // Send message
    await page.locator('[data-testid="send-button"]').click()
    
    // Check message appears
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Mobile test message')
  })
})

test.describe('Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
  })

  test('should handle multiple possibilities efficiently', async ({ page }) => {
    await page.goto('/')
    
    // Monitor performance while generating possibilities
    await page.locator('[data-testid="message-input"]').fill('Performance test')
    
    const startTime = Date.now()
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for all possibilities to be visible
    await expect(page.locator('[data-testid="possibility-item"]')).toHaveCount(30, { timeout: 60000 })
    
    const generationTime = Date.now() - startTime
    expect(generationTime).toBeLessThan(30000) // Should complete within 30 seconds
    
    // Check that the page is still responsive
    await expect(page.locator('[data-testid="message-input"]')).toBeEnabled()
  })
})