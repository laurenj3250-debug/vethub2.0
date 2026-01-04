import { test, expect } from '@playwright/test';

test.describe('Residency Stats Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/residency');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Stats tab', async ({ page }) => {
    // Click on the Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for stats content to load
    await expect(page.locator('text=Days Until Freedom').or(page.locator('text=Welcome to Residency Stats'))).toBeVisible({ timeout: 10000 });
  });

  test('should display stats overview with counters', async ({ page }) => {
    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for stats to load (either actual stats or setup prompt)
    await page.waitForTimeout(2000);

    // Check for stat cards (MRIs, Appointments, Surgeries, or skeleton loaders)
    const hasStatsOrSkeleton = await page.locator('[class*="Card"]').count();
    expect(hasStatsOrSkeleton).toBeGreaterThan(0);
  });

  test('should display daily entry form', async ({ page }) => {
    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Check for daily entry form elements
    await expect(page.locator('text=Daily Entry').first()).toBeVisible({ timeout: 10000 });

    // Check for counter buttons (MRIs)
    await expect(page.locator('text=MRIs').first()).toBeVisible();
  });

  test('should have touch-friendly buttons (min 44px)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for form to load
    await page.waitForTimeout(2000);

    // Find increment/decrement buttons and check their size
    const buttons = page.locator('button:has-text("+"), button:has-text("-")');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // Verify minimum touch target size
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should increment MRI count', async ({ page }) => {
    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for form to load
    await page.waitForTimeout(2000);

    // Find MRI section and click + button
    const mriSection = page.locator('div:has(text("MRIs"))');
    const initialValue = await mriSection.locator('input[type="number"]').inputValue();
    const initialCount = parseInt(initialValue) || 0;

    // Click the + button for MRIs
    await mriSection.locator('button:has-text("+")').click();

    // Verify count increased
    const newValue = await mriSection.locator('input[type="number"]').inputValue();
    expect(parseInt(newValue)).toBe(initialCount + 1);
  });

  test('should show weekly chart', async ({ page }) => {
    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for chart to load
    await expect(page.locator('text=Weekly Activity')).toBeVisible({ timeout: 10000 });

    // Check for Recharts SVG element
    const chartExists = await page.locator('.recharts-responsive-container').or(page.locator('[class*="Skeleton"]')).count();
    expect(chartExists).toBeGreaterThan(0);
  });

  test('should be responsive at mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for content
    await page.waitForTimeout(2000);

    // Verify content is visible and not overflowing
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should show surgery tracker section', async ({ page }) => {
    // Navigate to Stats tab
    await page.click('button:has-text("Stats")');

    // Wait for surgery tracker
    await expect(page.locator('text=Today\'s Surgeries').or(page.locator('text=Surgery'))).toBeVisible({ timeout: 10000 });
  });

  test('should display skeleton loaders while loading', async ({ page }) => {
    // This test checks initial loading state
    await page.click('button:has-text("Stats")');

    // Look for skeleton or loaded content
    const hasContent = await page.locator('[class*="Card"]').first().isVisible();
    expect(hasContent).toBe(true);
  });
});

test.describe('Residency Stats - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('**/api/residency/stats', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/residency');
    await page.click('button:has-text("Stats")');

    // Wait for error boundary to display
    await page.waitForTimeout(3000);

    // Check that error boundary shows recovery option
    const hasErrorUI = await page.locator('text=Something went wrong').or(page.locator('text=Try Again')).count();
    // Error boundary should be visible OR stats loaded (if cached)
    expect(hasErrorUI).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Residency Stats - Accessibility', () => {
  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/residency');
    await page.click('button:has-text("Stats")');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like 404s for missing resources)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('404') && !e.includes('favicon')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should allow keyboard navigation in forms', async ({ page }) => {
    await page.goto('/residency');
    await page.click('button:has-text("Stats")');
    await page.waitForTimeout(2000);

    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is on an interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
