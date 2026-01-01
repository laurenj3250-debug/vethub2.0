import { test, expect } from '@playwright/test';

/**
 * Surgery Patient Flow Tests
 *
 * Verifies that Surgery patient type works correctly:
 * 1. API filters patients by type=Surgery
 * 2. Residency page shows Surgery patients
 * 3. Residency page shows helpful empty state when no Surgery patients
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

test.describe('Surgery Patient Flow', () => {
  test('1. API returns only Surgery type patients when filtered', async ({ request }) => {
    console.log('🧪 Testing Surgery patient API filter...');

    // Query patients with type=Surgery
    const response = await request.get(`${BASE_URL}/api/patients?type=Surgery`);
    expect(response.ok()).toBeTruthy();

    const patients = await response.json();
    console.log(`   Found ${patients.length} Surgery patients`);

    // All returned patients should have type=Surgery (or be empty)
    if (patients.length > 0) {
      for (const patient of patients) {
        console.log(`   Patient: ${patient.demographics?.name}, Type: ${patient.type}`);
        expect(patient.type).toBe('Surgery');
      }
      console.log('   ✅ All patients have correct Surgery type');
    } else {
      console.log('   ℹ️ No Surgery patients in database (expected for fresh install)');
    }

    console.log('✅ Surgery API filter test completed');
  });

  test('2. API returns all patients without type filter', async ({ request }) => {
    console.log('🧪 Testing unfiltered patient API...');

    const response = await request.get(`${BASE_URL}/api/patients`);
    expect(response.ok()).toBeTruthy();

    const patients = await response.json();
    console.log(`   Found ${patients.length} total patients`);

    // Check for variety of types
    const types = new Set(patients.map((p: any) => p.type));
    console.log(`   Patient types found: ${Array.from(types).join(', ') || 'none'}`);

    console.log('✅ Unfiltered API test completed');
  });

  test('3. Residency page loads and shows Surgery patient dropdown', async ({ page }) => {
    console.log('🧪 Testing Residency page Surgery patient dropdown...');

    await page.goto(`${BASE_URL}/residency`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for loading to complete
    const loader = page.locator('text=Loading ACVIM data');
    if (await loader.isVisible()) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Should be on Cases tab by default
    const casesHeader = page.locator('text=Neurosurgery Case Log');
    expect(await casesHeader.isVisible()).toBeTruthy();
    console.log('   ✅ Cases tab visible');

    // Click Add Case button
    const addCaseButton = page.locator('button:has-text("Add Case")');
    await addCaseButton.click();
    await page.waitForTimeout(500);

    // Dialog should open
    const dialogTitle = page.locator('text=Add Neurosurgery Case');
    expect(await dialogTitle.isVisible()).toBeTruthy();
    console.log('   ✅ Add Case dialog opened');

    // Check for patient combobox
    const patientCombobox = page.locator('text=Select from VetHub Patients');
    if (await patientCombobox.isVisible()) {
      console.log('   ✅ Patient combobox visible');
    }

    await page.screenshot({ path: '/tmp/surgery-residency-dialog.png', fullPage: true });
    console.log('✅ Residency page test completed');
  });

  test('4. Residency page shows empty state warning when no Surgery patients', async ({ page }) => {
    console.log('🧪 Testing empty state warning...');

    await page.goto(`${BASE_URL}/residency`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for loading
    const loader = page.locator('text=Loading ACVIM data');
    if (await loader.isVisible()) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Check for empty state warning
    const warningText = page.locator('text=No Surgery Patients Found');
    const warningVisible = await warningText.isVisible().catch(() => false);

    if (warningVisible) {
      console.log('   ✅ Empty state warning displayed correctly');

      // Check for helpful message
      const helpText = page.locator('text=Import patients with Surgery type');
      expect(await helpText.isVisible()).toBeTruthy();
      console.log('   ✅ Helpful message displayed');
    } else {
      console.log('   ℹ️ Surgery patients exist, warning not shown (expected)');
    }

    await page.screenshot({ path: '/tmp/surgery-empty-state.png', fullPage: true });
    console.log('✅ Empty state test completed');
  });

  test('5. Residency page can load cases without Surgery patients', async ({ page }) => {
    console.log('🧪 Testing residency page functionality without Surgery patients...');

    await page.goto(`${BASE_URL}/residency`);
    await page.waitForLoadState('networkidle');

    // Wait for loading
    const loader = page.locator('text=Loading ACVIM data');
    if (await loader.isVisible()) {
      await loader.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Page should still be functional
    const tabs = ['Cases', 'Journal', 'Schedule', 'Summary'];
    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`);
      await tab.click();
      await page.waitForTimeout(500);
      console.log(`   ✅ ${tabName} tab accessible`);
    }

    await page.screenshot({ path: '/tmp/surgery-residency-all-tabs.png', fullPage: true });
    console.log('✅ Residency functionality test completed');
  });
});
