import { chromium, FullConfig } from '@playwright/test';
import { TestDataFactory } from '../test-data';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test suite setup...');
  
  // Create a browser instance for setup operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if the development server is running
    const baseURL = (config as any).use?.baseURL || 'http://localhost:3000';
    console.log(`📡 Checking server availability at ${baseURL}`);
    
    await page.goto(baseURL, { timeout: 30000 });
    
    // Verify the app loads correctly
    await page.waitForSelector('body', { timeout: 10000 });
    
    console.log('✅ Server is running and app loads correctly');
    
    // Clear any existing test data
    console.log('🧹 Cleaning up any existing test data...');
    await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      Object.keys(localStorage)
        .filter(key => regex.test(key))
        .forEach(key => localStorage.removeItem(key));
      
      Object.keys(sessionStorage)
        .filter(key => regex.test(key))
        .forEach(key => sessionStorage.removeItem(key));
    }, TestDataFactory.getCleanupPattern().source);
    
    // Setup global test environment variables
    process.env.E2E_TESTING = 'true';
    
    // Create test output directory
    
    const outputDir = path.join(process.cwd(), 'e2e-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const screenshotsDir = path.join(outputDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    console.log('📁 Test output directories created');
    
    // Validate critical dependencies
    console.log('🔍 Validating critical app components...');
    
    // Check that the main chat interface exists
    const chatContainer = page.locator('[data-testid="chat-container"]');
    if (!(await chatContainer.isVisible())) {
      throw new Error('Chat container not found - critical component missing');
    }
    
    const messageInput = page.locator('[data-testid="message-input"]');
    if (!(await messageInput.isVisible())) {
      throw new Error('Message input not found - critical component missing');
    }
    
    console.log('✅ Critical components validated');
    
    // Check for console errors during initial load
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.warn('⚠️  Console errors detected during setup:');
      consoleErrors.forEach(error => console.warn(`  - ${error}`));
    }
    
    // Store setup timestamp for test reporting
    const setupData = {
      timestamp: new Date().toISOString(),
      baseURL,
      nodeEnv: process.env.NODE_ENV,
      errors: consoleErrors,
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'setup-info.json'),
      JSON.stringify(setupData, null, 2)
    );
    
    console.log('🎯 E2E test suite setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;