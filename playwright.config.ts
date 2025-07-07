import { defineConfig, devices } from '@playwright/test'

/**
 * Comprehensive E2E Testing Configuration for chatsbox.ai
 * 
 * Following Dave Farley's principles:
 * - Fast feedback with optimized parallel execution
 * - Reliable tests with proper waits and smart retries
 * - Comprehensive coverage of critical user journeys
 * - Cross-platform testing with real user scenarios
 * - Performance monitoring and memory leak detection
 * - Clean test isolation with no side effects
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test organization and execution */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : 6, // Optimized for connection pooling limit
  
  /* Test timeouts */
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  /* Global test setup */
  globalSetup: './e2e/fixtures/helpers/global-setup.ts',
  globalTeardown: './e2e/fixtures/helpers/global-teardown.ts',
  
  /* Reporting configuration */
  reporter: [
    ['html', { 
      outputFolder: 'e2e-results/html-report',
      open: 'never'
    }],
    ['json', { 
      outputFile: 'e2e-results/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'e2e-results/junit.xml' 
    }],
    ['github'], // GitHub Actions integration
    ['list', { printSteps: true }],
  ],
  
  /* Base configuration for all tests */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Browser and viewport settings */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* Performance and debugging */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Test execution settings */
    actionTimeout: 15 * 1000, // 15 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for navigation
    
    /* Custom test attributes */
    storageState: undefined, // Each test starts with clean storage
    contextOptions: {
      reducedMotion: 'reduce', // Faster test execution
      forcedColors: 'none',
    },
  },

  /* Test projects - organized by test type and platform */
  projects: [
    /* Smoke tests - run first for fast feedback */
    {
      name: 'smoke-chrome',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      fullyParallel: true,
    },
    
    /* Critical flow tests - desktop browsers */
    {
      name: 'flows-chrome',
      testMatch: '**/flows/**/*.spec.ts',
      testIgnore: '**/mobile.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['smoke-chrome'],
    },
    
    {
      name: 'flows-firefox',
      testMatch: '**/flows/**/*.spec.ts',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['smoke-chrome'],
    },
    
    {
      name: 'flows-safari',
      testMatch: '**/flows/**/*.spec.ts',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['smoke-chrome'],
    },
    
    /* Mobile-specific tests */
    {
      name: 'mobile-chrome',
      testMatch: '**/flows/mobile.spec.ts',
      use: { 
        ...devices['Pixel 7'],
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['flows-chrome'],
    },
    
    {
      name: 'mobile-safari',
      testMatch: '**/flows/mobile.spec.ts',
      use: { 
        ...devices['iPhone 14'],
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['flows-chrome'],
    },
    
    /* Tablet testing */
    {
      name: 'tablet-chrome',
      testMatch: '**/flows/**/*.spec.ts',
      testIgnore: '**/mobile.spec.ts',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true,
      },
      dependencies: ['mobile-chrome'],
    },
    
    /* Performance and load tests */
    {
      name: 'performance',
      testMatch: '**/performance/**/*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['flows-chrome'],
      timeout: 5 * 60 * 1000, // 5 minutes for performance tests
    },
    
    /* Cross-browser compatibility - extended viewports */
    {
      name: 'compatibility-large',
      testMatch: '**/smoke/critical-path.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      dependencies: ['flows-chrome'],
    },
    
    {
      name: 'compatibility-small',
      testMatch: '**/smoke/critical-path.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
      dependencies: ['flows-chrome'],
    },
  ],

  /* Development server configuration */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      E2E_TESTING: 'true',
    },
  },
  
  /* Test output configuration */
  outputDir: 'test-results',
  
  /* Metadata for test reporting */
  metadata: {
    'Test Suite': 'chatsbox.ai E2E Tests',
    'Test Framework': 'Playwright',
    'Test Design': 'Dave Farley Principles',
    'Coverage': 'Critical User Journeys',
    'Platforms': 'Desktop + Mobile + Tablet',
    'Browsers': 'Chrome, Firefox, Safari',
  },
})