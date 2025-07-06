/**
 * API Integration E2E Tests
 * 
 * Tests API endpoints and integrations that are critical for the application
 */

import { test, expect } from '@playwright/test'

test.describe('API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should handle API key validation', async ({ page }) => {
    // Open settings
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('[data-testid="api-keys-tab"]').click()
    
    // Test invalid API key
    await page.locator('[data-testid="openai-api-key-input"]').fill('invalid-key')
    await page.locator('[data-testid="validate-openai-key"]').click()
    
    // Should show validation error
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="api-key-error"]')).toContainText('invalid')
  })

  test('should handle API rate limiting gracefully', async ({ page }) => {
    // Mock rate limit responses
    await page.route('**/api/chat/completions', route => {
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
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test rate limiting')
    await page.locator('[data-testid="send-button"]').click()
    
    // Should show rate limit handling
    await expect(page.locator('[data-testid="rate-limit-notice"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('should handle network connectivity issues', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => {
      route.abort('failed')
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test network failure')
    await page.locator('[data-testid="send-button"]').click()
    
    // Should show offline/connectivity notice
    await expect(page.locator('[data-testid="connectivity-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('should handle conversation storage', async ({ page }) => {
    // Send a message
    await page.locator('[data-testid="message-input"]').fill('Test conversation storage')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for message to be stored
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Test conversation storage')
    
    // Check conversation ID is generated
    const conversationId = await page.evaluate(() => {
      return localStorage.getItem('currentConversationId')
    })
    
    expect(conversationId).toBeTruthy()
    
    // Verify conversation can be retrieved
    await page.goto(`/conversation/${conversationId}`)
    await expect(page.locator('[data-testid="user-message"]')).toContainText('Test conversation storage')
  })

  test('should handle encrypted settings storage', async ({ page }) => {
    // Configure API key
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('[data-testid="api-keys-tab"]').click()
    
    await page.locator('[data-testid="openai-api-key-input"]').fill('test-api-key-12345')
    await page.locator('[data-testid="save-openai-key"]').click()
    
    // Check that key is encrypted in storage (not plaintext)
    const storedData = await page.evaluate(() => {
      return localStorage.getItem('encryptedApiKeys') || localStorage.getItem('apiKeys')
    })
    
    expect(storedData).toBeTruthy()
    expect(storedData).not.toContain('test-api-key-12345') // Should be encrypted
    
    // Close and reopen settings to verify persistence
    await page.locator('[data-testid="close-settings"]').click()
    await page.locator('[data-testid="settings-button"]').click()
    await page.locator('[data-testid="api-keys-tab"]').click()
    
    // Key should be loaded (shows as configured)
    await expect(page.locator('[data-testid="openai-key-status"]')).toContainText('configured')
  })

  test('should validate API responses', async ({ page }) => {
    // Mock malformed API response
    await page.route('**/api/chat/completions', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          // Missing required fields
          incomplete: 'response'
        })
      })
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test API validation')
    await page.locator('[data-testid="send-button"]').click()
    
    // Should handle malformed response gracefully
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="api-error"]')).toContainText('Invalid response')
  })

  test('should handle authentication flow', async ({ page }) => {
    // Mock authentication endpoints
    await page.route('**/api/auth/**', route => {
      const url = route.request().url()
      if (url.includes('signin')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              email: 'test@example.com',
              name: 'Test User'
            }
          })
        })
      } else {
        route.continue()
      }
    })
    
    // Test sign in
    await page.locator('[data-testid="login-button"]').click()
    
    // Should redirect to auth
    await expect(page).toHaveURL(/.*auth.*/)
    
    // Mock successful auth and return
    await page.goto('/')
    
    // Should show user as authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle streaming API responses', async ({ page }) => {
    let streamedData = ''
    
    // Mock streaming response
    await page.route('**/api/possibility/**', route => {
      const readable = new ReadableStream({
        start(controller) {
          const chunks = [
            'data: {"token": "Hello"}\n\n',
            'data: {"token": " world"}\n\n',
            'data: {"token": "!"}\n\n',
            'data: {"done": true}\n\n'
          ]
          
          let index = 0
          const interval = setInterval(() => {
            if (index < chunks.length) {
              controller.enqueue(new TextEncoder().encode(chunks[index]))
              index++
            } else {
              clearInterval(interval)
              controller.close()
            }
          }, 500)
        }
      })
      
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"token": "Hello"}\n\ndata: {"token": " world"}\n\ndata: {"token": "!"}\n\ndata: {"done": true}\n\n'
      })
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test streaming API')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for streaming to complete
    const firstPossibility = page.locator('[data-testid="possibility-item"]').first()
    await expect(firstPossibility.locator('[data-testid="possibility-content"]')).toContainText('Hello world!')
  })

  test('should handle concurrent API requests', async ({ page }) => {
    // Track concurrent requests
    const activeRequests = new Set()
    
    page.on('request', request => {
      if (request.url().includes('/api/possibility/')) {
        activeRequests.add(request.url())
      }
    })
    
    page.on('response', response => {
      if (response.url().includes('/api/possibility/')) {
        activeRequests.delete(response.url())
      }
    })
    
    await page.locator('[data-testid="message-input"]').fill('Test concurrent requests')
    await page.locator('[data-testid="send-button"]').click()
    
    // Wait for requests to start
    await page.waitForTimeout(2000)
    
    // Should have multiple concurrent requests (up to connection pool limit)
    expect(activeRequests.size).toBeGreaterThan(1)
    expect(activeRequests.size).toBeLessThanOrEqual(6) // Max pool size
  })
})