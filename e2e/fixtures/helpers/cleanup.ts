import { Page } from '@playwright/test';
import { TestDataFactory } from '../test-data';

// Global shared state that persists across all route handler calls
const globalSharedState = {
  apiKeys: {} as Record<string, string>,
  hasConfiguredOpenAI: false,
  lastApiKeySaveTime: 0
};

export class TestCleanup {
  static async cleanLocalStorage(page: Page): Promise<void> {
    await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      Object.keys(localStorage)
        .filter(key => regex.test(key))
        .forEach(key => localStorage.removeItem(key));
    }, TestDataFactory.getCleanupPattern().source);
  }

  static async cleanSessionStorage(page: Page): Promise<void> {
    await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      Object.keys(sessionStorage)
        .filter(key => regex.test(key))
        .forEach(key => sessionStorage.removeItem(key));
    }, TestDataFactory.getCleanupPattern().source);
  }

  static async cleanIndexedDB(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name?.startsWith('e2e_test_')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });
  }

  static async cleanAllTestData(page: Page): Promise<void> {
    await Promise.all([
      this.cleanLocalStorage(page),
      this.cleanSessionStorage(page),
      this.cleanIndexedDB(page),
    ]);
    
    // Reset the global shared state when cleaning test data
    globalSharedState.apiKeys = {};
    globalSharedState.hasConfiguredOpenAI = false;
    globalSharedState.lastApiKeySaveTime = 0;
  }

  static async interceptAndMockAPIs(page: Page): Promise<void> {
    // Use the global shared state that persists across route calls
    const sharedState = globalSharedState;

    // Mock NextAuth session to return authenticated user for E2E tests
    await page.route('**/api/auth/session', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'e2e-test-user',
            name: 'E2E Test User',
            email: 'e2e@test.com',
            image: null,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        }),
      });
    });

    // Mock specific API endpoints for E2E tests
    await page.route('**/api/apikeys/validate', route => {
      console.log(`[E2E Mock] ${route.request().method()} ${route.request().url()}`);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          isValid: true,
          provider: 'openai',
          message: 'API key is valid'
        }),
      });
    });

    await page.route('**/api/apikeys', async route => {
      const method = route.request().method();
      console.log(`[E2E Mock] ${method} ${route.request().url()}`);
      
      if (method === 'GET') {
        // For E2E tests, assume OpenAI is always configured to simplify the test flow
        // Real implementation would check actual storage
        const response = { 
          status: {
            openai: true,  // Always configured in E2E tests
            anthropic: false,
            google: false,
            mistral: false,
            together: false,
          }
        };
        console.log(`[E2E Mock] GET /api/apikeys returning:`, JSON.stringify(response, null, 2));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else if (method === 'POST') {
        // Simulate saving the API key - always successful in E2E tests
        const body = route.request().postDataJSON();
        console.log(`[E2E Mock] POST /api/apikeys with body:`, JSON.stringify(body, null, 2));
        
        // Return success response - in E2E tests, all saves succeed
        const response = { 
          status: {
            openai: true,  // Always configured after save in E2E tests
            anthropic: false,
            google: false,
            mistral: false,
            together: false,
          }
        };
        console.log(`[E2E Mock] POST /api/apikeys returning:`, JSON.stringify(response, null, 2));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        });
      } else if (method === 'DELETE') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/settings', route => {
      const method = route.request().method();
      console.log(`[E2E Mock] ${method} ${route.request().url()}`);
      
      if (method === 'GET') {
        const settingsResponse = {
          systemInstructions: [],
          temperatures: [],
          maxTokens: 1000,
          // Mock enabled providers - ensure OpenAI is enabled since we added an API key for it
          enabledProviders: {
            openai: true,
            anthropic: false,
            google: false,
            mistral: false,
            together: false,
          }
        };
        console.log(`[E2E Mock] GET /api/settings returning:`, JSON.stringify(settingsResponse, null, 2));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(settingsResponse),
        });
      } else if (method === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    // Mock external API calls to prevent real API usage
    await page.route('**/api.openai.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: { content: 'Mocked OpenAI response for E2E test' },
            finish_reason: 'stop',
          }],
        }),
      });
    });

    await page.route('**/api.anthropic.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ text: 'Mocked Anthropic response for E2E test' }],
          stop_reason: 'end_turn',
        }),
      });
    });

    await page.route('**/generativelanguage.googleapis.com/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{ text: 'Mocked Google response for E2E test' }],
            },
          }],
        }),
      });
    });

    await page.route('**/api.mistral.ai/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: { content: 'Mocked Mistral response for E2E test' },
            finish_reason: 'stop',
          }],
        }),
      });
    });

    await page.route('**/api.together.xyz/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{
            message: { content: 'Mocked Together AI response for E2E test' },
            finish_reason: 'stop',
          }],
        }),
      });
    });
  }

  static async mockStreamingResponses(page: Page): Promise<void> {
    // Mock SSE streaming responses
    await page.route('**/api/possibility/**', async route => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const messages = [
            'data: {"token": "Mocked "}\n\n',
            'data: {"token": "streaming "}\n\n',
            'data: {"token": "response"}\n\n',
            'data: {"done": true}\n\n',
          ];
          
          for (const message of messages) {
            controller.enqueue(encoder.encode(message));
            await TestDataFactory.delay(50); // Simulate streaming delay
          }
          controller.close();
        },
      });

      // Convert stream to string for Playwright
      const reader = stream.getReader();
      let result = '';
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          result += new TextDecoder().decode(value);
        }
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: result,
      });
    });
  }
}