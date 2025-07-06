import { Page } from '@playwright/test';
import { TestDataFactory } from '../test-data';

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
  }

  static async interceptAndMockAPIs(page: Page): Promise<void> {
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