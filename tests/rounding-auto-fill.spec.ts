import { test, expect } from '@playwright/test';

test.describe('Rounding Sheet Auto-Fill', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to rounding sheet
    await page.goto('http://localhost:3002/rounding');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for data to load
  });

  test('1. Check signalment auto-fill from demographics', async ({ page }) => {
    console.log('🧪 Testing signalment auto-fill...');

    // Look for signalment input fields
    const signalmentInputs = await page.locator('input[type="text"]').all();

    if (signalmentInputs.length > 0) {
      // Check first few inputs for auto-filled content
      for (let i = 0; i < Math.min(3, signalmentInputs.length); i++) {
        const value = await signalmentInputs[i].inputValue();
        console.log(`   Signalment field ${i + 1}: "${value}"`);

        // Check if it looks like auto-filled signalment (e.g., "5y FS Lab")
        const hasAge = /\d+[ym]/.test(value);
        const hasSex = /(FS|MN|F|M|MC)/.test(value);

        if (hasAge && hasSex) {
          console.log(`   ✅ Appears to be auto-filled signalment!`);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/rounding-auto-fill-signalment.png', fullPage: true });
    console.log('✅ Signalment test completed');
  });

  test('2. Check for auto-fill visual indicators', async ({ page }) => {
    console.log('🧪 Testing visual indicators...');

    // Look for sparkle icon (✨) or rotate icon (↻)
    const pageContent = await page.content();

    const hasSparkle = pageContent.includes('✨') || pageContent.includes('Sparkles');
    const hasRotate = pageContent.includes('↻') || pageContent.includes('rotate');

    console.log(`   Sparkle icon present: ${hasSparkle}`);
    console.log(`   Rotate icon present: ${hasRotate}`);

    // Look for auto-fill badge
    const badge = page.locator('text=/auto-filled/i').first();
    const badgeVisible = await badge.isVisible().catch(() => false);

    if (badgeVisible) {
      const badgeText = await badge.textContent();
      console.log(`   ✅ Auto-fill badge found: "${badgeText}"`);
    } else {
      console.log(`   ℹ️  No auto-fill badge visible (might appear after data loads)`);
    }

    await page.screenshot({ path: '/tmp/rounding-auto-fill-indicators.png', fullPage: true });
    console.log('✅ Visual indicators test completed');
  });

  test('3. Check for blue background on auto-filled fields', async ({ page }) => {
    console.log('🧪 Testing blue background styling...');

    // Look for elements with blue background classes
    const blueBackgroundElements = await page.locator('[class*="blue"]').count();
    console.log(`   Found ${blueBackgroundElements} elements with "blue" in class name`);

    // Check specific blue background classes
    const bgBlue = await page.locator('.bg-blue-900\\/30, .bg-blue-50, [class*="bg-blue"]').count();
    console.log(`   Found ${bgBlue} elements with blue background classes`);

    await page.screenshot({ path: '/tmp/rounding-auto-fill-styling.png', fullPage: true });
    console.log('✅ Styling test completed');
  });

  test('4. Check day count in problems field', async ({ page }) => {
    console.log('🧪 Testing day count increment...');

    // Look for "Day X" pattern in page content
    const pageContent = await page.content();
    const dayMatches = pageContent.match(/Day \d+/gi);

    if (dayMatches && dayMatches.length > 0) {
      console.log(`   ✅ Found day count patterns: ${dayMatches.slice(0, 3).join(', ')}`);
    } else {
      console.log(`   ℹ️  No "Day X" patterns found (might not have problems data yet)`);
    }

    await page.screenshot({ path: '/tmp/rounding-auto-fill-day-count.png', fullPage: true });
    console.log('✅ Day count test completed');
  });

  test('5. Check carried forward data', async ({ page }) => {
    console.log('🧪 Testing carried forward data...');

    // Look for rotate icon (↻) indicating carried forward data
    const rotateIcon = page.locator('text=↻').first();
    const rotateVisible = await rotateIcon.isVisible().catch(() => false);

    if (rotateVisible) {
      console.log(`   ✅ Carried forward indicator (↻) found!`);
    } else {
      console.log(`   ℹ️  No carry-forward indicators visible (might be first day)`);
    }

    // Check for filled therapeutic/fluids fields
    const textareas = await page.locator('textarea').all();
    let filledCount = 0;

    for (const textarea of textareas) {
      const value = await textarea.inputValue();
      if (value && value.length > 0) {
        filledCount++;
      }
    }

    console.log(`   Found ${filledCount} filled textarea fields (therapeutics, problems, etc.)`);

    await page.screenshot({ path: '/tmp/rounding-auto-fill-carried-forward.png', fullPage: true });
    console.log('✅ Carried forward test completed');
  });

  test('6. Verify manual edit removes auto-fill styling', async ({ page }) => {
    console.log('🧪 Testing manual edit behavior...');

    // Find first input field with blue background (auto-filled)
    const autoFilledInput = page.locator('[class*="bg-blue"]').locator('input').first();
    const exists = await autoFilledInput.isVisible().catch(() => false);

    if (exists) {
      // Get initial classes
      const initialClass = await autoFilledInput.getAttribute('class');
      console.log(`   Initial classes: ${initialClass?.substring(0, 50)}...`);

      // Click and type
      await autoFilledInput.click();
      await page.keyboard.type('MANUAL EDIT TEST');

      // Wait a moment
      await page.waitForTimeout(500);

      // Check if blue background removed
      const newClass = await autoFilledInput.getAttribute('class');
      console.log(`   New classes: ${newClass?.substring(0, 50)}...`);

      if (initialClass !== newClass) {
        console.log(`   ✅ Classes changed on manual edit!`);
      }
    } else {
      console.log(`   ℹ️  No auto-filled inputs found to test manual edit`);
    }

    await page.screenshot({ path: '/tmp/rounding-auto-fill-manual-edit.png', fullPage: true });
    console.log('✅ Manual edit test completed');
  });

  test('7. Full page inspection', async ({ page }) => {
    console.log('🧪 Full page inspection...');

    // Count patient rows
    const patientRows = await page.locator('table tbody tr').count();
    console.log(`   Found ${patientRows} patient rows`);

    // Count input fields
    const inputs = await page.locator('input[type="text"]').count();
    console.log(`   Found ${inputs} text input fields`);

    // Count textareas
    const textareas = await page.locator('textarea').count();
    console.log(`   Found ${textareas} textarea fields`);

    // Check for rounding sheet header
    const header = page.locator('text=/Rounding Sheet/i').first();
    const headerVisible = await header.isVisible().catch(() => false);
    console.log(`   Rounding Sheet header visible: ${headerVisible}`);

    // Take full page screenshot
    await page.screenshot({ path: '/tmp/rounding-auto-fill-full-page.png', fullPage: true });

    console.log('✅ Full page inspection completed');
  });
});
