import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for testing Railway production
 */
export default defineConfig({
  testDir: './',
  testMatch: '**/test-all-features.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html']],

  use: {
    baseURL: 'https://empathetic-clarity-production.up.railway.app',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true, // Ignore SSL certificate errors for Railway
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer - testing production directly
});
