/**
 * Load Testing E2E Tests
 * 
 * Tests system behavior under load to validate scalability
 * Following Dave Farley's principle of testing non-functional requirements
 */

import { test, expect } from '@playwright/test'

test.describe('Load Testing', () => {
  test.describe.configure({ mode: 'serial' }) // Run load tests one at a time
  
  test('should handle concurrent possibility generation', async ({ page, browser }) => {
    // Create multiple pages to simulate concurrent users
    const pages = [page]
    
    // Create additional browser contexts for concurrent testing
    for (let i = 1; i < 3; i++) {
      const context = await browser.newContext()
      const newPage = await context.newPage()
      await newPage.goto('/')
      pages.push(newPage)
    }
    
    // Start concurrent generation on all pages
    const startTime = Date.now()
    
    await Promise.all(pages.map(async (p, index) => {
      await p.locator('[data-testid="message-input"]').fill(`Concurrent test ${index + 1}: Generate a detailed explanation`)
      await p.locator('[data-testid="send-button"]').click()
    }))
    
    // Wait for all generations to start
    await Promise.all(pages.map(async (p) => {
      await expect(p.locator('[data-testid="possibility-item"]').first()).toBeVisible({ timeout: 30000 })
    }))
    
    // Check that all pages are generating possibilities
    for (const p of pages) {
      const possibilityCount = await p.locator('[data-testid="possibility-item"]').count()
      expect(possibilityCount).toBeGreaterThan(0)
    }
    
    // Wait for reasonable completion
    await Promise.all(pages.map(async (p) => {
      await expect(p.locator('[data-testid="streaming-indicator"]').first()).not.toBeVisible({ timeout: 60000 })
    }))
    
    const totalTime = Date.now() - startTime
    expect(totalTime).toBeLessThan(90000) // Should complete within 90 seconds even under load
    
    // Clean up additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close()
    }
  })

  test('should maintain performance with multiple possibilities', async ({ page }) => {
    // Configure for maximum possibilities to stress test
    await page.goto('/')
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('[data-testid="generation-settings-tab"]').click()
    
    // Enable all models to maximize possibilities
    const modelCheckboxes = page.locator('[data-testid^="model-"]')
    const modelCount = await modelCheckboxes.count()
    
    for (let i = 0; i < modelCount; i++) {
      const checkbox = modelCheckboxes.nth(i)
      await checkbox.check()
    }
    
    // Set multiple temperatures
    await page.locator('[data-testid="temperature-0.3"]').check()
    await page.locator('[data-testid="temperature-0.7"]').check()
    await page.locator('[data-testid="temperature-1.0"]').check()
    
    await page.locator('[data-testid="save-settings"]').click()
    await page.locator('[data-testid="close-settings"]').click()
    
    // Monitor performance during generation
    const startTime = Date.now()
    
    await page.locator('[data-testid="message-input"]').fill('Performance stress test: generate many possibilities')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for possibilities to start generating
    await expect(page.locator('[data-testid="possibility-item"]').first()).toBeVisible({ timeout: 30000 })
    
    // Check that page remains responsive
    const responseCheckInterval = 5000
    let checkCount = 0
    const maxChecks = 12 // Check for 1 minute
    
    while (checkCount < maxChecks) {
      await page.waitForTimeout(responseCheckInterval)
      
      // Test page responsiveness
      const startResponseTime = Date.now()
      await page.locator('[data-testid="message-input"]').focus()
      const responseTime = Date.now() - startResponseTime
      
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
      
      // Check if generation is complete
      const streamingIndicators = page.locator('[data-testid="streaming-indicator"]')
      const isStillStreaming = await streamingIndicators.first().isVisible().catch(() => false)
      
      if (!isStillStreaming) {
        break
      }
      
      checkCount++
    }
    
    const totalTime = Date.now() - startTime
    console.log(`Load test completed in ${totalTime}ms`)
    
    // Verify all possibilities loaded
    const finalPossibilityCount = await page.locator('[data-testid="possibility-item"]').count()
    expect(finalPossibilityCount).toBeGreaterThan(20) // Should have many possibilities
  })

  test('should handle rapid successive requests', async ({ page }) => {
    await page.goto('/')
    
    // Send multiple rapid requests
    const requests = [
      'Quick test 1',
      'Quick test 2', 
      'Quick test 3',
      'Quick test 4',
      'Quick test 5'
    ]
    
    for (const request of requests) {
      await page.locator('[data-testid="message-input"]').fill(request)
      await page.locator('[data-testid="send-button"]').click()
      
      // Wait briefly before next request
      await page.waitForTimeout(2000)
    }
    
    // Wait for all conversations to be visible
    await page.waitForTimeout(5000)
    
    // Check that all messages are in the conversation
    for (const request of requests) {
      await expect(page.locator('[data-testid="user-message"]', { hasText: request })).toBeVisible()
    }
    
    // Verify system handled multiple requests gracefully
    const errorMessages = page.locator('[data-testid="error-message"]')
    expect(await errorMessages.count()).toBe(0)
  })

  test('should recover from connection pool exhaustion', async ({ page }) => {
    await page.goto('/')
    
    // Mock delayed responses to exhaust connection pool
    await page.route('**/api/possibility/**', async (route) => {
      // Delay response to simulate slow API
      await new Promise(resolve => setTimeout(resolve, 5000))
      route.continue()
    })
    
    // Send request that will use all connections
    await page.locator('[data-testid="message-input"]').fill('Connection pool exhaustion test')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for connection pool to be exhausted
    await page.waitForTimeout(3000)
    
    // Try to send another request
    await page.locator('[data-testid="message-input"]').fill('Second request during exhaustion')
    await page.locator('[data-testid="send-button"]').click()
    
    // Should show queuing or appropriate handling
    await expect(page.locator('[data-testid="generation-queued"]')).toBeVisible({ timeout: 10000 })
    
    // Wait for recovery
    await page.waitForTimeout(10000)
    
    // System should recover and process requests
    await expect(page.locator('[data-testid="user-message"]', { hasText: 'Second request during exhaustion' })).toBeVisible()
  })

  test('should handle memory pressure gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Generate many conversations to test memory handling
    for (let i = 0; i < 10; i++) {
      await page.locator('[data-testid="message-input"]').fill(`Memory test conversation ${i + 1}`)
      await page.locator('[data-testid="send-button"]').click()
      
      // Wait for response to start
      await expect(page.locator('[data-testid="possibility-item"]').first()).toBeVisible({ timeout: 30000 })
      
      // Clear and start new conversation
      await page.locator('[data-testid="new-conversation"]').click()
      await page.waitForTimeout(1000)
    }
    
    // Check that page is still responsive after memory pressure
    await page.locator('[data-testid="message-input"]').fill('Final memory test')
    await page.locator('[data-testid="send-button"]').click()
    
    await expect(page.locator('[data-testid="user-message"]', { hasText: 'Final memory test' })).toBeVisible()
  })

  test('should maintain virtual scrolling performance with many items', async ({ page }) => {
    await page.goto('/')
    
    // Generate conversation with many possibilities
    await page.locator('[data-testid="message-input"]').fill('Virtual scrolling performance test with long content generation')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for possibilities to load
    await expect(page.locator('[data-testid="possibility-item"]').first()).toBeVisible({ timeout: 30000 })
    
    const possibilitiesPanel = page.locator('[data-testid="possibilities-panel"]')
    
    // Test scrolling performance
    const scrollTests = [
      () => possibilitiesPanel.evaluate(el => el.scrollTop = 0), // Top
      () => possibilitiesPanel.evaluate(el => el.scrollTop = el.scrollHeight / 4), // 25%
      () => possibilitiesPanel.evaluate(el => el.scrollTop = el.scrollHeight / 2), // 50%
      () => possibilitiesPanel.evaluate(el => el.scrollTop = el.scrollHeight * 3/4), // 75%
      () => possibilitiesPanel.evaluate(el => el.scrollTop = el.scrollHeight), // Bottom
    ]
    
    for (const scrollTest of scrollTests) {
      const startTime = Date.now()
      await scrollTest()
      await page.waitForTimeout(100) // Allow render
      const scrollTime = Date.now() - startTime
      
      expect(scrollTime).toBeLessThan(500) // Scrolling should be smooth
      
      // Verify content is still visible
      const visibleItems = page.locator('[data-testid="possibility-item"]:visible')
      expect(await visibleItems.count()).toBeGreaterThan(0)
    }
  })

  test('should handle API rate limiting under load', async ({ page }) => {
    await page.goto('/')
    
    // Mock rate limiting after several requests
    let requestCount = 0
    await page.route('**/api/**', (route) => {
      requestCount++
      if (requestCount > 10) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_error'
            }
          })
        })
      } else {
        route.continue()
      }
    })
    
    // Send requests until rate limited
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="message-input"]').fill(`Rate limit test ${i + 1}`)
      await page.locator('[data-testid="send-button"]').click()
      await page.waitForTimeout(500)
    }
    
    // Should handle rate limiting gracefully
    await expect(page.locator('[data-testid="rate-limit-notice"]')).toBeVisible({ timeout: 15000 })
    
    // Should offer retry mechanism
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })
})