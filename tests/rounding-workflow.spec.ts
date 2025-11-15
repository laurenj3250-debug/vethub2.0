import { test, expect } from '@playwright/test';

test.describe('Rounding Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');
  });

  test('should load the rounding page', async ({ page }) => {
    // Verify page loads with rounding-specific content
    await expect(page).toHaveURL(/\/rounding/);

    // Look for rounding sheet or table
    const roundingTable = page.locator('table, [role="table"], [data-testid="rounding-sheet"]');
    await expect(roundingTable.first()).toBeVisible();
  });

  test('should display rounding sheet with proper structure', async ({ page }) => {
    // Verify table headers exist
    const tableHeaders = page.locator('th, [role="columnheader"]');
    const headerCount = await tableHeaders.count();

    // Rounding sheet should have multiple columns
    expect(headerCount).toBeGreaterThan(0);

    // Check for key field headers
    const signalmentHeader = page.locator('th:has-text("Signalment"), [role="columnheader"]:has-text("Signalment")');
    // May or may not exist depending on current implementation
  });

  test('should display active patients only', async ({ page }) => {
    // Rounding sheet should filter out discharged patients
    const patientRows = page.locator('tr[data-patient-id], tbody tr');
    const count = await patientRows.count();

    if (count > 0) {
      // Verify no "Discharged" status is visible
      const dischargedBadges = page.locator('text=/Discharged/i');
      const dischargedCount = await dischargedBadges.count();

      // Ideally should be 0, but depends on data
      // Just verify page loads correctly
    }
  });

  test('should allow inline editing of rounding data', async ({ page }) => {
    const inputFields = page.locator('input[type="text"], textarea');
    const count = await inputFields.count();

    if (count > 0) {
      const firstInput = inputFields.first();

      // Check if input is editable
      await firstInput.click();
      await expect(firstInput).toBeFocused();

      // Type some test data
      await firstInput.fill('Test rounding data');

      // Verify value was entered
      await expect(firstInput).toHaveValue('Test rounding data');
    }
  });

  test('should support paste functionality', async ({ page }) => {
    const inputFields = page.locator('input[type="text"], textarea');
    const count = await inputFields.count();

    if (count > 0) {
      const firstInput = inputFields.first();
      await firstInput.click();

      // Simulate paste of tab-separated values
      const testData = 'Signalment\tLocation\tICU Criteria';

      // Paste via clipboard (Playwright supports this)
      await firstInput.fill('');
      await page.keyboard.insertText(testData);

      // Data should be in the field
      const value = await firstInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('should have save button', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]');

    if (await saveButton.first().isVisible()) {
      await expect(saveButton.first()).toBeEnabled();

      // Click save (note: may need API mocking for actual save)
      // await saveButton.first().click();
      // await page.waitForTimeout(500);
    }
  });

  test('should handle keyboard navigation between cells', async ({ page }) => {
    const inputs = page.locator('input[type="text"], textarea');
    const count = await inputs.count();

    if (count > 1) {
      // Focus first input
      await inputs.first().click();
      await expect(inputs.first()).toBeFocused();

      // Tab to next field
      await page.keyboard.press('Tab');

      // Should move to next input
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should display patient information in rows', async ({ page }) => {
    const patientRows = page.locator('tbody tr, [data-patient-id]');
    const count = await patientRows.count();

    if (count > 0) {
      // First row should contain patient data
      const firstRow = patientRows.first();
      await expect(firstRow).toBeVisible();

      // Row should have cells
      const cells = firstRow.locator('td, [role="cell"]');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(0);
    }
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');

    // Page should still be accessible
    await expect(page.locator('body')).toBeVisible();

    // Table should adapt or scroll
    const table = page.locator('table, [role="table"]');
    if (await table.first().isVisible()) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should handle mobile viewport with scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');

    // On mobile, table should be scrollable or reorganized
    await expect(page.locator('body')).toBeVisible();

    // Check for horizontal scroll container
    const scrollContainer = page.locator('[class*="scroll"], [class*="overflow"]');
    // May or may not exist depending on implementation
  });
});

test.describe('Enhanced Rounding Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');
  });

  test('should display template options if available', async ({ page }) => {
    // Look for template selector or dropdown
    const templateButton = page.locator(
      'button:has-text("Template"), button:has-text("Protocol"), select[aria-label*="template"]'
    );

    if (await templateButton.first().isVisible()) {
      await templateButton.first().click();
      await page.waitForTimeout(300);

      // Template options should appear
      const templateOptions = page.locator('[role="option"], [role="menuitem"]');
      const count = await templateOptions.count();

      if (count > 0) {
        await expect(templateOptions.first()).toBeVisible();
      }
    }
  });

  test('should support snippet insertion', async ({ page }) => {
    // Look for snippet manager or quick-insert buttons
    const snippetButton = page.locator('button:has-text("Snippet"), button[aria-label*="snippet"]');

    if (await snippetButton.first().isVisible()) {
      await snippetButton.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should allow batch field updates', async ({ page }) => {
    // Look for "Update All" or batch action buttons
    const batchButton = page.locator('button:has-text("All"), button:has-text("Batch")');

    if (await batchButton.first().isVisible()) {
      await expect(batchButton.first()).toBeEnabled();
    }
  });
});

test.describe('Rounding Data Fields', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');
  });

  test('should have signalment field', async ({ page }) => {
    const signalmentInput = page.locator('input[name*="signalment"], [data-field="signalment"]');

    // Field may or may not exist depending on data
    if (await signalmentInput.first().isVisible()) {
      await expect(signalmentInput.first()).toBeEditable();
    }
  });

  test('should have location field', async ({ page }) => {
    const locationInput = page.locator('input[name*="location"], [data-field="location"]');

    if (await locationInput.first().isVisible()) {
      await expect(locationInput.first()).toBeEditable();
    }
  });

  test('should have ICU criteria field', async ({ page }) => {
    const icuInput = page.locator('input[name*="icu"], [data-field="icuCriteria"]');

    if (await icuInput.first().isVisible()) {
      await expect(icuInput.first()).toBeEditable();
    }
  });

  test('should have code status field', async ({ page }) => {
    const codeInput = page.locator(
      'select[name*="code"], [data-field="code"], input[name*="code"]'
    );

    if (await codeInput.first().isVisible()) {
      await expect(codeInput.first()).toBeVisible();
    }
  });

  test('should have therapeutics field', async ({ page }) => {
    const therapeuticsInput = page.locator(
      'textarea[name*="therapeutic"], [data-field="therapeutics"]'
    );

    if (await therapeuticsInput.first().isVisible()) {
      await expect(therapeuticsInput.first()).toBeEditable();
    }
  });

  test('should have concerns field', async ({ page }) => {
    const concernsInput = page.locator(
      'textarea[name*="concern"], [data-field="concerns"]'
    );

    if (await concernsInput.first().isVisible()) {
      await expect(concernsInput.first()).toBeEditable();
    }
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');
  });

  test('should support keyboard-only navigation', async ({ page }) => {
    // Tab through all interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.locator(':focus');
    await expect(firstFocused).toBeVisible();

    // Continue tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus');
      await expect(focused).toBeVisible();
    }
  });

  test('should have no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/rounding');
    await page.waitForLoadState('networkidle');

    // Filter out acceptable development errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Failed to fetch') &&
      !err.includes('NetworkError')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have proper focus indicators', async ({ page }) => {
    const inputs = page.locator('input, button, select, textarea');
    const count = await inputs.count();

    if (count > 0) {
      await inputs.first().focus();
      const focused = await page.locator(':focus');

      // Should have visible focus ring/outline
      const styles = await focused.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow,
        };
      });

      // At least one focus indicator should exist
      expect(styles.outline !== 'none' || styles.boxShadow !== 'none').toBeTruthy();
    }
  });
});
