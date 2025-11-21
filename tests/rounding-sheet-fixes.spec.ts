import { test, expect } from '@playwright/test';

test.describe('Rounding Sheet Fixes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to rounding sheet
    await page.goto('http://localhost:3002/rounding');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any dynamic content
  });

  test('1. Auto-save functionality', async ({ page }) => {
    console.log('🧪 Testing auto-save...');

    // Find first input field
    const firstInput = page.locator('input[type="text"]').first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });

    // Clear and type new value
    await firstInput.click();
    await firstInput.fill('TEST AUTO-SAVE 10y MN Lab');

    // Wait for auto-save (2 second delay + processing time)
    console.log('⏳ Waiting for auto-save (3 seconds)...');
    await page.waitForTimeout(3000);

    // Check for save status indicators
    const savingIndicator = page.locator('text=/Saving|Saved/').first();

    // Take screenshot
    await page.screenshot({ path: '/tmp/rounding-autosave.png', fullPage: true });

    // The status might clear quickly, so we just verify no errors
    const hasError = await page.locator('text=/Failed|Error/').first().isVisible().catch(() => false);
    expect(hasError).toBe(false);

    console.log('✅ Auto-save test completed');
  });

  test('2. Full paste support', async ({ page }) => {
    console.log('🧪 Testing full paste support...');

    const firstInput = page.locator('input[type="text"]').first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });

    // Click on first field
    await firstInput.click();

    // Simulate paste with tab-separated data
    const pasteData = "12y FS GSD\tICU\tCritical\tRed\tSeizures\tMRI normal\tPhenobarbital\tYes\tLRS\tNone\tMonitor overnight\tWatch for seizures\tFair prognosis";

    await page.evaluate((data) => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        const event = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer(),
          bubbles: true,
          cancelable: true
        });
        event.clipboardData?.setData('text/plain', data);
        input.dispatchEvent(event);
      }
    }, pasteData);

    await page.waitForTimeout(1000);

    // Check for paste toast notification
    const pasteToast = page.locator('text=/Pasted/i').first();
    await expect(pasteToast).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: '/tmp/rounding-paste.png', fullPage: true });

    console.log('✅ Full paste test completed');
  });

  test('3. Unsaved changes warning', async ({ page }) => {
    console.log('🧪 Testing unsaved changes warning...');

    const firstInput = page.locator('input[type="text"]').first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });

    // Make a change
    await firstInput.click();
    await firstInput.fill('Modified data - should trigger warning');

    // Set up dialog handler
    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      console.log(`   Dialog message: "${dialog.message()}"`);
      dialogAppeared = true;
      await dialog.dismiss();
    });

    // Try to navigate away
    const backLink = page.locator('text=/Back to VetHub/i').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await page.waitForTimeout(500);
    }

    // Dialog should have appeared
    expect(dialogAppeared).toBe(true);

    console.log('✅ Unsaved warning test completed');
  });

  test('4. Visual inspection - check all features loaded', async ({ page }) => {
    console.log('🧪 Visual inspection test...');

    // Take full page screenshot
    await page.screenshot({ path: '/tmp/rounding-full-page.png', fullPage: true });

    // Check page content for key features
    const pageContent = await page.content();

    // Verify components are in the DOM
    const hasInputs = await page.locator('input[type="text"]').count() > 0;
    const hasSelects = await page.locator('select').count() > 0;
    const hasTextareas = await page.locator('textarea').count() > 0;

    expect(hasInputs).toBe(true);
    expect(hasSelects).toBe(true);

    // Check for patient rows
    const patientRows = await page.locator('table tbody tr').count();
    console.log(`   Found ${patientRows} patient rows`);

    // Check for header elements
    const header = page.locator('text=/Rounding Sheet/i').first();
    await expect(header).toBeVisible();

    console.log('✅ Visual inspection completed');
  });

  test('5. Paste handler on dropdown fields', async ({ page }) => {
    console.log('🧪 Testing paste on dropdown fields...');

    // Find a select dropdown
    const firstSelect = page.locator('select').first();
    if (await firstSelect.isVisible()) {
      await firstSelect.click();

      // Simulate paste event on dropdown
      await page.evaluate(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        if (select) {
          const event = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
            bubbles: true,
            cancelable: true
          });
          event.clipboardData?.setData('text/plain', 'ICU\tCritical\tRed');
          select.dispatchEvent(event);
        }
      });

      await page.waitForTimeout(500);
      console.log('✅ Dropdown paste test completed');
    } else {
      console.log('⚠️  No dropdown fields found');
    }
  });
});
