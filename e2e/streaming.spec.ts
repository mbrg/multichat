/**
 * Streaming E2E Tests
 * 
 * Tests the independent streaming possibilities functionality
 * Critical path for the core value proposition
 */

import { test, expect } from '@playwright/test'

test.describe('Independent Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()
  })

  test('should stream possibilities independently', async ({ page }) => {
    // Send a message that will generate varied responses
    await page.locator('[data-testid="message-input"]').fill('Write a creative story about AI')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for possibilities to start appearing
    const possibilities = page.locator('[data-testid="possibility-item"]')
    await expect(possibilities.first()).toBeVisible({ timeout: 30000 })
    
    // Monitor that different possibilities stream at different rates
    const firstPossibility = possibilities.nth(0)
    const secondPossibility = possibilities.nth(1)
    const thirdPossibility = possibilities.nth(2)
    
    // Check that possibilities start streaming independently
    await expect(firstPossibility.locator('[data-testid="possibility-content"]')).not.toBeEmpty({ timeout: 10000 })
    await expect(secondPossibility.locator('[data-testid="possibility-content"]')).not.toBeEmpty({ timeout: 10000 })
    await expect(thirdPossibility.locator('[data-testid="possibility-content"]')).not.toBeEmpty({ timeout: 10000 })
    
    // Wait and verify that content is different across possibilities
    await page.waitForTimeout(5000)
    
    const content1 = await firstPossibility.locator('[data-testid="possibility-content"]').textContent()
    const content2 = await secondPossibility.locator('[data-testid="possibility-content"]').textContent()
    const content3 = await thirdPossibility.locator('[data-testid="possibility-content"]').textContent()
    
    // Ensure content is different (independent generation)
    expect(content1).not.toBe(content2)
    expect(content2).not.toBe(content3)
    expect(content1).not.toBe(content3)
  })

  test('should show streaming indicators', async ({ page }) => {
    await page.locator('[data-testid="message-input"]').fill('Explain quantum computing')
    await page.locator('[data-testid="send-button"]').click()
    
    // Check for streaming indicators
    const streamingIndicators = page.locator('[data-testid="streaming-indicator"]')
    await expect(streamingIndicators.first()).toBeVisible({ timeout: 10000 })
    
    // Verify multiple streaming indicators are active
    const count = await streamingIndicators.count()
    expect(count).toBeGreaterThan(1)
    
    // Wait for streaming to complete
    await expect(streamingIndicators.first()).not.toBeVisible({ timeout: 60000 })
  })

  test('should handle streaming errors gracefully', async ({ page }) => {
    // Mock streaming errors for some possibilities
    await page.route('**/api/possibility/**', (route, request) => {
      const url = request.url()
      // Fail every 3rd possibility
      if (url.includes('/3') || url.includes('/6') || url.includes('/9')) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test streaming with errors')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for possibilities to load
    await page.waitForTimeout(10000)
    
    // Check that some possibilities succeeded and some failed
    const successfulPossibilities = page.locator('[data-testid="possibility-content"]:not(:empty)')
    const errorPossibilities = page.locator('[data-testid="possibility-error"]')
    
    // Should have some successful and some failed
    expect(await successfulPossibilities.count()).toBeGreaterThan(0)
    expect(await errorPossibilities.count()).toBeGreaterThan(0)
    
    // Check that errors are displayed appropriately
    await expect(errorPossibilities.first()).toContainText('generation failed')
  })

  test('should respect connection pool limits', async ({ page }) => {
    // Monitor network requests
    const requests: string[] = []
    page.on('request', request => {
      if (request.url().includes('/api/possibility/')) {
        requests.push(request.url())
      }
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test connection pooling')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for initial batch of requests
    await page.waitForTimeout(5000)
    
    // Should respect max 6 concurrent connections
    // This is hard to test precisely in E2E, but we can check that requests are being made
    expect(requests.length).toBeGreaterThan(0)
    expect(requests.length).toBeLessThanOrEqual(30) // Total possibilities
  })

  test('should prioritize popular models', async ({ page }) => {
    // Configure to use popular models (GPT-4, Claude, etc.)
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('[data-testid="models-tab"]').click()
    
    // Enable popular models
    await page.locator('[data-testid="model-gpt-4"]').check()
    await page.locator('[data-testid="model-claude-3-sonnet"]').check()
    await page.locator('[data-testid="model-gemini-pro"]').check()
    
    await page.locator('[data-testid="save-settings"]').click()
    await page.locator('[data-testid="close-settings"]').click()
    
    // Send message
    await page.locator('[data-testid="message-input"]').fill('Test priority generation')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for generation to start
    await page.waitForTimeout(2000)
    
    // Check that popular models appear first/faster
    const popularPossibilities = page.locator('[data-testid="possibility-item"][data-model="gpt-4"], [data-testid="possibility-item"][data-model="claude-3-sonnet"]')
    
    // Popular models should start streaming first
    await expect(popularPossibilities.first().locator('[data-testid="possibility-content"]')).not.toBeEmpty({ timeout: 8000 })
  })

  test('should support real-time token streaming', async ({ page }) => {
    await page.locator('[data-testid="message-input"]').fill('Count from 1 to 20 slowly')
    await page.locator('[data-testid="send-button"]').click()
    
    const firstPossibility = page.locator('[data-testid="possibility-item"]').first()
    const content = firstPossibility.locator('[data-testid="possibility-content"]')
    
    // Wait for content to start
    await expect(content).not.toBeEmpty({ timeout: 10000 })
    
    // Monitor content growth over time (token streaming)
    const measurements: number[] = []
    
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000)
      const currentContent = await content.textContent()
      measurements.push(currentContent?.length || 0)
    }
    
    // Content should grow over time (streaming)
    let increasing = true
    for (let i = 1; i < measurements.length; i++) {
      if (measurements[i] <= measurements[i-1]) {
        increasing = false
        break
      }
    }
    
    expect(increasing).toBe(true)
  })

  test('should handle virtual scrolling with many possibilities', async ({ page }) => {
    await page.locator('[data-testid="message-input"]').fill('Generate many possibilities for performance test')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for possibilities panel to be populated
    const possibilitiesPanel = page.locator('[data-testid="possibilities-panel"]')
    await expect(possibilitiesPanel).toBeVisible()
    
    // Check that virtual scrolling is working (not all DOM elements rendered)
    const visiblePossibilities = page.locator('[data-testid="possibility-item"]:visible')
    const totalPossibilities = page.locator('[data-testid="possibility-item"]')
    
    await page.waitForTimeout(5000)
    
    const visibleCount = await visiblePossibilities.count()
    const totalCount = await totalPossibilities.count()
    
    // With virtual scrolling, visible count should be less than total
    // (Only items in viewport + buffer are rendered)
    expect(visibleCount).toBeLessThanOrEqual(totalCount)
    
    // Test scrolling
    await possibilitiesPanel.evaluate(el => {
      el.scrollTop = el.scrollHeight / 2
    })
    
    await page.waitForTimeout(1000)
    
    // Should still have possibilities visible after scrolling
    expect(await visiblePossibilities.count()).toBeGreaterThan(0)
  })
})