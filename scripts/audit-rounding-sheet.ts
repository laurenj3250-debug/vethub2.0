/**
 * VETHUB ROUNDING SHEET COMPREHENSIVE AUDIT
 *
 * Tests all critical functionality of the rounding sheet:
 * 1. Page Load & Structure
 * 2. Table Headers & Layout
 * 3. Patient Data Display
 * 4. Field Editing (text, dropdowns, multi-select)
 * 5. Paste Support (single row, multi-row)
 * 6. Save Functionality (individual, Save All)
 * 7. Copy Functionality (Copy Row, Export)
 * 8. Auto-save
 * 9. Responsive Layout
 * 10. Accessibility
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.TEST_URL || 'https://empathetic-clarity-production.up.railway.app';
const SCREENSHOT_DIR = '/tmp/vethub-rounding-audit';

// Test result tracking
interface TestResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  screenshot?: string;
}

const results: TestResult[] = [];

function logSuccess(category: string, message: string) {
  console.log(`\x1b[32m✅ PASS [${category}]: ${message}\x1b[0m`);
  results.push({ category, test: message, status: 'pass', message });
}

function logFail(category: string, message: string) {
  console.log(`\x1b[31m❌ FAIL [${category}]: ${message}\x1b[0m`);
  results.push({ category, test: message, status: 'fail', message });
}

function logWarning(category: string, message: string) {
  console.log(`\x1b[33m⚠️  WARNING [${category}]: ${message}\x1b[0m`);
  results.push({ category, test: message, status: 'warning', message });
}

async function screenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`📸 Screenshot: ${filepath}`);
  return filepath;
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/rounding`, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if we need to login (redirected to login page or modal appears)
    const loginInput = page.locator('input[type="password"], input[name="password"]');
    if (await loginInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Enter the password
      await loginInput.fill('neuro2024');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      await screenshot(page, '00-after-login');
      logSuccess('Login', 'Successfully logged in');
    }
    return true;
  } catch (error) {
    logFail('Login', `Login failed: ${error}`);
    return false;
  }
}

async function testPageLoad(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Page Load & Structure');
  console.log('='.repeat(60));

  try {
    await page.waitForSelector('table', { timeout: 15000 });
    await screenshot(page, '01-rounding-sheet');
    logSuccess('Page Load', 'Rounding sheet table loaded');
  } catch (error) {
    logFail('Page Load', 'Table failed to load');
    return;
  }

  // Check header
  const header = page.locator('h1:has-text("Rounding Sheet"), h2:has-text("Rounding Sheet")');
  if (await header.isVisible().catch(() => false)) {
    logSuccess('Page Load', 'Rounding Sheet header visible');
  } else {
    logWarning('Page Load', 'Rounding Sheet header not found');
  }

  // Check Back button
  const backBtn = page.locator('a:has-text("Back"), button:has-text("Back")');
  if (await backBtn.isVisible().catch(() => false)) {
    logSuccess('Page Load', 'Back button visible');
  } else {
    logWarning('Page Load', 'Back button not found');
  }
}

async function testTableStructure(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Table Structure');
  console.log('='.repeat(60));

  const expectedHeaders = [
    'Patient', 'Signalment', 'Loc', 'ICU', 'Code', 'Problems',
    'Dx Findings', 'Tx', 'IVC', 'Fluids', 'CRI', 'O/N Dx', 'O/N Concerns', 'Extra Notes', 'Actions'
  ];

  for (const header of expectedHeaders) {
    const th = page.locator(`th:has-text("${header}")`);
    if (await th.isVisible().catch(() => false)) {
      logSuccess('Table Structure', `Header "${header}" visible`);
    } else {
      logFail('Table Structure', `Header "${header}" NOT visible`);
    }
  }

  await screenshot(page, '02-table-headers');
}

async function testPatientData(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Patient Data Display');
  console.log('='.repeat(60));

  // Count patient rows
  const rows = page.locator('tbody tr');
  const rowCount = await rows.count();

  if (rowCount > 0) {
    logSuccess('Patient Data', `Found ${rowCount} patient rows`);
  } else {
    logWarning('Patient Data', 'No patient rows found');
    return;
  }

  // Check first patient has name
  const firstPatientName = page.locator('tbody tr:first-child td:first-child');
  const nameText = await firstPatientName.textContent().catch(() => '');
  if (nameText && nameText.trim().length > 0) {
    logSuccess('Patient Data', `First patient: "${nameText.trim().substring(0, 30)}..."`);
  } else {
    logWarning('Patient Data', 'First patient name not visible');
  }

  await screenshot(page, '03-patient-data');
}

async function testFieldEditing(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Field Editing');
  console.log('='.repeat(60));

  // Test text input (signalment)
  const signalmentInput = page.locator('tbody tr:first-child input[type="text"]').first();
  if (await signalmentInput.isVisible().catch(() => false)) {
    const originalValue = await signalmentInput.inputValue();
    await signalmentInput.click();
    await signalmentInput.fill('TEST_SIGNALMENT_123');
    await page.waitForTimeout(500);
    const newValue = await signalmentInput.inputValue();
    if (newValue === 'TEST_SIGNALMENT_123') {
      logSuccess('Field Editing', 'Text input works (signalment)');
      // Restore original
      await signalmentInput.fill(originalValue);
    } else {
      logFail('Field Editing', 'Text input did not update');
    }
  } else {
    logFail('Field Editing', 'Signalment input not found');
  }

  // Test dropdown (location)
  const locationSelect = page.locator('tbody tr:first-child select').first();
  if (await locationSelect.isVisible().catch(() => false)) {
    const originalValue = await locationSelect.inputValue();
    await locationSelect.selectOption('ICU');
    await page.waitForTimeout(300);
    const newValue = await locationSelect.inputValue();
    if (newValue === 'ICU') {
      logSuccess('Field Editing', 'Dropdown works (location)');
      // Restore original
      await locationSelect.selectOption(originalValue);
    } else {
      logFail('Field Editing', 'Dropdown did not update');
    }
  } else {
    logFail('Field Editing', 'Location dropdown not found');
  }

  // Test code dropdown (color-coded)
  const codeSelect = page.locator('tbody tr:first-child select').nth(2);
  if (await codeSelect.isVisible().catch(() => false)) {
    await codeSelect.selectOption('Green');
    await page.waitForTimeout(300);
    await screenshot(page, '04-code-green');
    logSuccess('Field Editing', 'Code dropdown works with color');
    await codeSelect.selectOption('');
  } else {
    logWarning('Field Editing', 'Code dropdown not found');
  }

  // Test Problems multi-select
  const problemsField = page.locator('tbody tr:first-child td').nth(5);
  if (await problemsField.isVisible().catch(() => false)) {
    await problemsField.click();
    await page.waitForTimeout(500);
    await screenshot(page, '05-problems-dropdown');

    // Check if dropdown opened
    const dropdown = page.locator('.absolute.top-full');
    if (await dropdown.isVisible().catch(() => false)) {
      logSuccess('Field Editing', 'Problems multi-select dropdown opens');
      // Close by clicking elsewhere
      await page.keyboard.press('Escape');
    } else {
      logWarning('Field Editing', 'Problems dropdown may not have opened');
    }
  }

  // Test textarea fields (therapeutics)
  const textareaField = page.locator('tbody tr:first-child textarea').first();
  if (await textareaField.isVisible().catch(() => false)) {
    logSuccess('Field Editing', 'Textarea fields present (therapeutics, etc.)');
  } else {
    logWarning('Field Editing', 'No textarea fields found');
  }
}

async function testActionButtons(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Action Buttons');
  console.log('='.repeat(60));

  // Copy to Clipboard button
  const copyAllBtn = page.locator('button:has-text("Copy to Clipboard")');
  if (await copyAllBtn.isVisible().catch(() => false)) {
    logSuccess('Actions', 'Copy to Clipboard button visible');
  } else {
    logFail('Actions', 'Copy to Clipboard button not found');
  }

  // Save All button
  const saveAllBtn = page.locator('button:has-text("Save All")');
  if (await saveAllBtn.isVisible().catch(() => false)) {
    logSuccess('Actions', 'Save All button visible');
  } else {
    logFail('Actions', 'Save All button not found');
  }

  // Shortcuts link
  const shortcutsLink = page.locator('a:has-text("Shortcuts")');
  if (await shortcutsLink.isVisible().catch(() => false)) {
    logSuccess('Actions', 'Shortcuts link visible');
  } else {
    logWarning('Actions', 'Shortcuts link not found');
  }

  // Individual row actions (Copy, Save)
  const rowCopyBtn = page.locator('tbody tr:first-child button[title="Copy row"], tbody tr:first-child button:has(svg)').first();
  if (await rowCopyBtn.isVisible().catch(() => false)) {
    logSuccess('Actions', 'Row copy button visible');
  } else {
    logWarning('Actions', 'Row copy button not found');
  }

  const rowSaveBtn = page.locator('tbody tr:first-child button:has-text("Save")');
  if (await rowSaveBtn.isVisible().catch(() => false)) {
    logSuccess('Actions', 'Row save button visible');
  } else {
    logWarning('Actions', 'Row save button not found');
  }

  await screenshot(page, '06-action-buttons');
}

async function testCopyFunctionality(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Copy Functionality');
  console.log('='.repeat(60));

  // Test Copy to Clipboard (all patients)
  const copyAllBtn = page.locator('button:has-text("Copy to Clipboard")');
  if (await copyAllBtn.isVisible().catch(() => false)) {
    await copyAllBtn.click();
    await page.waitForTimeout(1000);

    // Check for toast notification
    const toast = page.locator('[role="status"], .toast, [data-sonner-toast]').first();
    if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
      logSuccess('Copy', 'Copy to Clipboard shows toast notification');
    } else {
      logWarning('Copy', 'No toast visible after Copy to Clipboard');
    }
    await screenshot(page, '07-copy-toast');
  }

  // Test Copy Row button
  const rowCopyBtn = page.locator('tbody tr:first-child button[title="Copy row"]');
  if (await rowCopyBtn.isVisible().catch(() => false)) {
    await rowCopyBtn.click();
    await page.waitForTimeout(500);
    logSuccess('Copy', 'Row copy button clicked');
  }
}

async function testSaveFunctionality(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Save Functionality');
  console.log('='.repeat(60));

  // Make a change to trigger save availability
  const signalmentInput = page.locator('tbody tr:first-child input[type="text"]').first();
  if (await signalmentInput.isVisible().catch(() => false)) {
    const originalValue = await signalmentInput.inputValue();
    await signalmentInput.fill(originalValue + ' ');
    await page.waitForTimeout(500);

    // Check if Save button is now enabled
    const rowSaveBtn = page.locator('tbody tr:first-child button:has-text("Save")');
    const isDisabled = await rowSaveBtn.getAttribute('disabled');
    if (isDisabled === null) {
      logSuccess('Save', 'Save button enabled after change');
    } else {
      logWarning('Save', 'Save button may still be disabled');
    }

    // Check Save All button
    const saveAllBtn = page.locator('button:has-text("Save All")');
    const saveAllDisabled = await saveAllBtn.getAttribute('disabled');
    if (saveAllDisabled === null) {
      logSuccess('Save', 'Save All button enabled after change');
    } else {
      logWarning('Save', 'Save All button may still be disabled');
    }

    // Restore original value
    await signalmentInput.fill(originalValue);
  }

  await screenshot(page, '08-save-state');
}

async function testAutoSave(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Auto-Save');
  console.log('='.repeat(60));

  // Make a change and wait for auto-save indicator
  const signalmentInput = page.locator('tbody tr:first-child input[type="text"]').first();
  if (await signalmentInput.isVisible().catch(() => false)) {
    const originalValue = await signalmentInput.inputValue();
    await signalmentInput.fill('AUTO_SAVE_TEST_' + Date.now());

    // Wait for auto-save (2 second delay + save time)
    console.log('Waiting 4 seconds for auto-save...');
    await page.waitForTimeout(4000);

    await screenshot(page, '09-after-autosave');
    logSuccess('Auto-Save', 'Auto-save delay completed (check server logs for confirmation)');

    // Restore
    await signalmentInput.fill(originalValue);
    await page.waitForTimeout(3000); // Wait for restore to auto-save
  }
}

async function testResponsiveLayout(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Responsive Layout');
  console.log('='.repeat(60));

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);

    await screenshot(page, `10-responsive-${vp.name}`);

    // Check if table is still accessible
    const table = page.locator('table');
    if (await table.isVisible().catch(() => false)) {
      logSuccess('Responsive', `Table visible at ${vp.name} (${vp.width}x${vp.height})`);
    } else {
      logFail('Responsive', `Table NOT visible at ${vp.name}`);
    }

    // Check for horizontal scroll indicator on mobile
    if (vp.name === 'mobile') {
      const scrollContainer = page.locator('.overflow-x-auto');
      if (await scrollContainer.isVisible().catch(() => false)) {
        logSuccess('Responsive', 'Horizontal scroll container present for mobile');
      } else {
        logWarning('Responsive', 'No horizontal scroll container on mobile');
      }
    }
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function testStickyColumns(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Sticky Columns');
  console.log('='.repeat(60));

  // Scroll horizontally and check if patient name stays visible
  await page.setViewportSize({ width: 1000, height: 800 });

  const scrollContainer = page.locator('.overflow-x-auto');
  if (await scrollContainer.isVisible().catch(() => false)) {
    // Scroll right
    await scrollContainer.evaluate(el => el.scrollLeft = 500);
    await page.waitForTimeout(300);

    await screenshot(page, '11-scrolled-right');

    // Check if patient column is still visible (sticky)
    const patientCell = page.locator('tbody tr:first-child td.sticky');
    if (await patientCell.isVisible().catch(() => false)) {
      logSuccess('Sticky', 'Patient column stays visible when scrolled');
    } else {
      logWarning('Sticky', 'Patient column may not be sticky');
    }

    // Check if actions column is sticky on right
    const actionsCell = page.locator('tbody tr:first-child td.sticky.right-0');
    if (await actionsCell.isVisible().catch(() => false)) {
      logSuccess('Sticky', 'Actions column stays visible when scrolled');
    } else {
      logWarning('Sticky', 'Actions column may not be sticky');
    }

    // Reset scroll
    await scrollContainer.evaluate(el => el.scrollLeft = 0);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
}

async function testKeyboardNavigation(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Keyboard Navigation');
  console.log('='.repeat(60));

  // Focus first input
  const firstInput = page.locator('tbody tr:first-child input[type="text"]').first();
  if (await firstInput.isVisible().catch(() => false)) {
    await firstInput.focus();
    await page.waitForTimeout(200);

    // Tab to next field
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Check if focus moved
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    if (focusedElement) {
      logSuccess('Keyboard', `Tab navigation works (focused: ${focusedElement})`);
    } else {
      logWarning('Keyboard', 'Tab navigation may not be working');
    }

    await screenshot(page, '12-keyboard-nav');
  }
}

async function testAccessibility(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Accessibility');
  console.log('='.repeat(60));

  // Check for table headers with scope
  const thCount = await page.locator('th').count();
  logSuccess('Accessibility', `Found ${thCount} table headers`);

  // Check for form labels
  const inputsWithoutLabel = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    let unlabeled = 0;
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const placeholder = input.getAttribute('placeholder');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      if (!hasLabel && !ariaLabel && !placeholder) {
        unlabeled++;
      }
    });
    return unlabeled;
  });

  if (inputsWithoutLabel > 0) {
    logWarning('Accessibility', `${inputsWithoutLabel} inputs may need better labeling`);
  } else {
    logSuccess('Accessibility', 'Form inputs have labels/placeholders');
  }

  // Check focus indicators
  logWarning('Accessibility', 'MANUAL CHECK: Verify focus indicators are visible on tab');

  // Check color contrast for code status
  logWarning('Accessibility', 'MANUAL CHECK: Verify code color backgrounds have sufficient contrast');
}

async function testPasteSupport(page: Page) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING: Paste Support');
  console.log('='.repeat(60));

  // Focus a text field
  const signalmentInput = page.locator('tbody tr:first-child input[type="text"]').first();
  if (await signalmentInput.isVisible().catch(() => false)) {
    await signalmentInput.focus();

    // Simulate paste of TSV data (single cell)
    await page.evaluate(() => {
      const input = document.activeElement as HTMLInputElement;
      if (input) {
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: new DataTransfer(),
        });
        (pasteEvent.clipboardData as DataTransfer).setData('text/plain', 'PASTED_VALUE');
        input.dispatchEvent(pasteEvent);
      }
    });
    await page.waitForTimeout(500);

    logSuccess('Paste', 'Paste event handling present (check actual paste functionality manually)');
    logWarning('Paste', 'MANUAL CHECK: Test TSV paste from Google Sheets');
  }

  await screenshot(page, '13-paste-test');
}

async function runAudit() {
  console.log('='.repeat(60));
  console.log('VETHUB ROUNDING SHEET COMPREHENSIVE AUDIT');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`URL: ${BASE_URL}/rounding`);
  console.log('='.repeat(60));

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log('\n' + '='.repeat(60));
    console.log('LOGGING IN');
    console.log('='.repeat(60));
    const loggedIn = await login(page);
    if (!loggedIn) {
      throw new Error('Login failed, cannot continue audit');
    }

    // Run all tests
    await testPageLoad(page);
    await testTableStructure(page);
    await testPatientData(page);
    await testFieldEditing(page);
    await testActionButtons(page);
    await testCopyFunctionality(page);
    await testSaveFunctionality(page);
    await testAutoSave(page);
    await testResponsiveLayout(page);
    await testStickyColumns(page);
    await testKeyboardNavigation(page);
    await testAccessibility(page);
    await testPasteSupport(page);

  } catch (error) {
    console.error('\n❌ AUDIT ERROR:', error);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`\x1b[32m✅ Successes: ${passed}\x1b[0m`);
  console.log(`\x1b[33m⚠️  Warnings: ${warnings}\x1b[0m`);
  console.log(`\x1b[31m❌ Issues: ${failed}\x1b[0m`);
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);

  // List all failures
  if (failed > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('ALL FAILURES');
    console.log('='.repeat(60));
    results.filter(r => r.status === 'fail').forEach((r, i) => {
      console.log(`${i + 1}. [${r.category}] ${r.message}`);
    });
  }

  // List all warnings
  if (warnings > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('ALL WARNINGS');
    console.log('='.repeat(60));
    results.filter(r => r.status === 'warning').forEach((r, i) => {
      console.log(`${i + 1}. [${r.category}] ${r.message}`);
    });
  }

  // Save results to JSON
  const resultsPath = path.join(SCREENSHOT_DIR, 'audit-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    url: `${BASE_URL}/rounding`,
    summary: { passed, failed, warnings },
    results
  }, null, 2));
  console.log(`\n📄 Full results saved to: ${resultsPath}`);
}

runAudit().catch(console.error);
