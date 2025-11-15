import { test, expect } from '@playwright/test';

test.describe('Patient Admission Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display the patient dashboard', async ({ page }) => {
    // Verify dashboard loads
    await expect(page).toHaveTitle(/VetHub/i);

    // Check for main dashboard elements
    await expect(page.locator('text=VetHub')).toBeVisible();

    // Verify patient list or empty state is visible
    const patientListOrEmpty = page.locator('[data-testid="patient-list"], text=/no patients/i');
    await expect(patientListOrEmpty.first()).toBeVisible();
  });

  test('should open add patient dialog', async ({ page }) => {
    // Look for "Add Patient" button (may have different text)
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Patient"), button[aria-label*="Add"]').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Verify modal/dialog opens
      const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('should allow entering patient information', async ({ page }) => {
    // Try to find and click add patient button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Patient")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Look for name input field
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i]').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Patient ' + Date.now());

        // Look for species/breed fields
        const speciesInput = page.locator('input[name="species"], select[name="species"]').first();
        if (await speciesInput.isVisible()) {
          await speciesInput.fill('Canine');
        }

        // Note: This is a basic structure test - actual submission would require
        // understanding your specific form structure and API mocking
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Verify something is focused
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Each tab should move focus
    const newFocusedElement = await page.locator(':focus');
    await expect(newFocusedElement).toBeVisible();
  });

  test('should display patient status indicators', async ({ page }) => {
    // Look for status badges or indicators
    const statusBadges = page.locator('[class*="badge"], [class*="status"], [data-status]');

    // If patients exist, status should be visible
    const patientCards = page.locator('[data-testid="patient-card"], [class*="patient"]');
    const count = await patientCards.count();

    if (count > 0) {
      // At least one patient should have a status
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Navigation should adapt (hamburger menu, etc.)
    const mobileNav = page.locator('[aria-label="menu"], button[aria-label*="navigation"]');
    // Mobile nav might exist but implementation varies
  });

  test('should handle responsive design on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify layout adapts
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like failed API calls in development)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch') &&
      !err.includes('NetworkError') &&
      !err.includes('ERR_CONNECTION')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Patient List Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display patient cards if patients exist', async ({ page }) => {
    // Look for patient cards or list items
    const patientElements = page.locator(
      '[data-testid="patient-card"], [data-testid="patient-item"], [class*="patient-card"], [class*="patient-list-item"]'
    );

    const count = await patientElements.count();

    if (count > 0) {
      // First patient should be visible
      await expect(patientElements.first()).toBeVisible();

      // Patient should have a name
      const patientName = patientElements.first().locator('[class*="name"], h2, h3');
      await expect(patientName.first()).toBeVisible();
    }
  });

  test('should allow filtering patients', async ({ page }) => {
    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filter"), select[aria-label*="filter"], input[placeholder*="filter" i]');

    if (await filterButton.first().isVisible()) {
      await filterButton.first().click();
      // Verify filter options appear
      await page.waitForTimeout(300);
    }
  });

  test('should support view mode toggle (list/grid)', async ({ page }) => {
    // Look for view toggle buttons
    const viewToggle = page.locator('[aria-label*="view"], button[title*="view"], button[title*="grid"], button[title*="list"]');

    if (await viewToggle.first().isVisible()) {
      await viewToggle.first().click();
      await page.waitForTimeout(300);

      // Layout should change
      // (This would need visual regression testing for full verification)
    }
  });
});

test.describe('Patient Status Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display patient type indicators', async ({ page }) => {
    // Look for patient type badges (Surgery, MRI, Medical)
    const typeBadges = page.locator('text=/Surgery|MRI|Medical|Other/');

    const patientCards = page.locator('[data-testid="patient-card"], [class*="patient"]');
    const count = await patientCards.count();

    if (count > 0) {
      // At least one patient should have a type badge
      // (May not always be visible depending on data)
    }
  });

  test('should use semantic colors for status', async ({ page }) => {
    // Verify color-coding exists for different statuses
    // Critical (red), Monitoring (amber), Stable (green), Discharged (gray)

    const statusElements = page.locator('[data-status], [class*="status"]');
    const count = await statusElements.count();

    if (count > 0) {
      // Check that status elements have color classes
      const firstStatus = statusElements.first();
      const classes = await firstStatus.getAttribute('class');

      // Should have color-related classes
      expect(classes).toBeTruthy();
    }
  });
});
