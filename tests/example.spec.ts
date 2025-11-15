import { test, expect } from '@playwright/test';

test.describe('VetHub Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/VetHub/i);
  });

  test('should be responsive at mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive at tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive at desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Verify page is visible
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have no console errors on homepage', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for console errors
    expect(consoleErrors).toHaveLength(0);
  });

  test('should allow keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Press Tab to navigate through interactive elements
    await page.keyboard.press('Tab');

    // Verify that focus is visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
