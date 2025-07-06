import { chromium, FullConfig } from '@playwright/test';
import { TestDataFactory } from '../test-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test suite teardown...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const baseURL = (config as any).use?.baseURL || 'http://localhost:3000';
    
    // Navigate to the app for cleanup
    await page.goto(baseURL, { timeout: 30000 });
    
    // Comprehensive cleanup of test data
    console.log('🗑️  Cleaning up all test data...');
    
    // Clear localStorage
    await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      const keysToRemove = Object.keys(localStorage).filter(key => regex.test(key));
      console.log(`Removing ${keysToRemove.length} localStorage items`);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }, TestDataFactory.getCleanupPattern().source);
    
    // Clear sessionStorage
    await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      const keysToRemove = Object.keys(sessionStorage).filter(key => regex.test(key));
      console.log(`Removing ${keysToRemove.length} sessionStorage items`);
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }, TestDataFactory.getCleanupPattern().source);
    
    // Clear IndexedDB
    await page.evaluate(async () => {
      try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name?.startsWith('e2e_test_')) {
            console.log(`Deleting IndexedDB: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
        }
      } catch (error) {
        console.warn('Error cleaning IndexedDB:', error);
      }
    });
    
    // Clear any service worker caches
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            if (cacheName.includes('e2e_test')) {
              console.log(`Deleting cache: ${cacheName}`);
              await caches.delete(cacheName);
            }
          }
        } catch (error) {
          console.warn('Error cleaning caches:', error);
        }
      }
    });
    
    // Generate test summary report
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = path.join(process.cwd(), 'e2e-results');
    const setupInfoPath = path.join(outputDir, 'setup-info.json');
    const teardownPath = path.join(outputDir, 'teardown-info.json');
    
    let setupInfo = {};
    if (fs.existsSync(setupInfoPath)) {
      setupInfo = JSON.parse(fs.readFileSync(setupInfoPath, 'utf8'));
    }
    
    const teardownData = {
      timestamp: new Date().toISOString(),
      setupTimestamp: (setupInfo as any).timestamp || 'unknown',
      duration: (setupInfo as any).timestamp ? 
        Date.now() - new Date((setupInfo as any).timestamp).getTime() : 'unknown',
      cleanupCompleted: true,
    };
    
    fs.writeFileSync(teardownPath, JSON.stringify(teardownData, null, 2));
    
    // Generate summary report
    const summaryPath = path.join(outputDir, 'test-session-summary.json');
    const summary = {
      ...setupInfo,
      ...teardownData,
      testSuite: 'chatsbox.ai E2E Tests',
      framework: 'Playwright',
      baseURL,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('📊 Test session summary generated');
    
    // Check for memory leaks or unclosed resources
    const performanceMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    if (performanceMetrics) {
      const memoryUsageMB = performanceMetrics.usedJSHeapSize / 1024 / 1024;
      console.log(`💾 Final memory usage: ${memoryUsageMB.toFixed(2)}MB`);
      
      if (memoryUsageMB > 100) {
        console.warn('⚠️  High memory usage detected - possible memory leak');
      }
    }
    
    // Verify cleanup was successful
    const remainingTestData = await page.evaluate((pattern) => {
      const regex = new RegExp(pattern);
      const localStorageItems = Object.keys(localStorage).filter(key => regex.test(key));
      const sessionStorageItems = Object.keys(sessionStorage).filter(key => regex.test(key));
      
      return {
        localStorage: localStorageItems.length,
        sessionStorage: sessionStorageItems.length,
      };
    }, TestDataFactory.getCleanupPattern().source);
    
    if (remainingTestData.localStorage > 0 || remainingTestData.sessionStorage > 0) {
      console.warn(`⚠️  Cleanup incomplete: ${remainingTestData.localStorage} localStorage, ${remainingTestData.sessionStorage} sessionStorage items remain`);
    } else {
      console.log('✅ Test data cleanup verified');
    }
    
    console.log('🏁 E2E test suite teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test suite
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalTeardown;