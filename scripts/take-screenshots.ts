/**
 * Simple script to take screenshots at different viewports
 */

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  try {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`📸 Taking ${name} screenshot (${viewport.width}x${viewport.height})...`);

      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/patient-import`);

      // Wait for page to load
      await page.waitForSelector('h1');

      // Take screenshot
      await page.screenshot({
        path: `screenshots/patient-import-${name}.png`,
        fullPage: true
      });

      console.log(`✅ Saved screenshots/patient-import-${name}.png`);

      await context.close();
    }

    console.log('\n✅ All screenshots taken successfully!');
  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
