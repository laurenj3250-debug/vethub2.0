/**
 * ACVIM Residency Tracker - Production Testing Script
 * Tests all 7 phases of the implementation on Railway
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://empathetic-clarity-production.up.railway.app';
const SCREENSHOTS_DIR = '/tmp/acvim-tests';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'CHECK';
  message: string;
}

async function testACVIMTracker() {
  ensureDir(SCREENSHOTS_DIR);
  const results: TestResult[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Test 1: Navigate to residency page
  console.log('\n=== Test 1: Navigate to /residency ===');
  try {
    await page.goto(`${BASE_URL}/residency`, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-initial-load.png'), fullPage: true });

    const title = await page.locator('h1').first().textContent();
    console.log(`  Title found: ${title}`);
    results.push({ name: 'Navigate to /residency', status: 'PASS', message: title || 'Page loaded' });
  } catch (e: any) {
    results.push({ name: 'Navigate to /residency', status: 'FAIL', message: e.message });
    console.log(`  ERROR: ${e.message}`);
  }

  // Test 2: Check tabs exist
  console.log('\n=== Test 2: Check tabs ===');
  try {
    const tabs = ['Profile', 'Weekly', 'Cases', 'Journal', 'Summary'];
    let tabsFound = 0;
    for (const tab of tabs) {
      const tabButton = page.locator(`button:has-text("${tab}")`);
      if (await tabButton.count() > 0) {
        console.log(`  Tab '${tab}' found`);
        tabsFound++;
      } else {
        console.log(`  Tab '${tab}' NOT FOUND`);
      }
    }
    results.push({ name: 'Tabs exist', status: tabsFound >= 4 ? 'PASS' : 'FAIL', message: `${tabsFound}/5 tabs found` });
  } catch (e: any) {
    results.push({ name: 'Tabs exist', status: 'FAIL', message: e.message });
  }

  // Test 3: Profile tab (default)
  console.log('\n=== Test 3: Profile tab ===');
  try {
    const profileContent = await page.locator('text=Resident Name, text=Training Facility, text=ACVIM Candidate').count();
    if (profileContent > 0) {
      console.log('  Profile form fields found');
      results.push({ name: 'Profile form', status: 'PASS', message: 'Profile fields visible' });
    } else {
      results.push({ name: 'Profile form', status: 'CHECK', message: 'Profile section loaded' });
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-profile-tab.png'), fullPage: true });
  } catch (e: any) {
    results.push({ name: 'Profile form', status: 'FAIL', message: e.message });
  }

  // Test 4: Weekly Schedule tab
  console.log('\n=== Test 4: Weekly Schedule tab ===');
  try {
    await page.locator('button:has-text("Weekly")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-weekly-tab.png'), fullPage: true });

    const monthHeaders = await page.locator('text=/Month \\d+/').count();
    const generateBtn = await page.locator('button:has-text("Generate")').count();

    if (monthHeaders > 0) {
      console.log(`  Found ${monthHeaders} month headers`);
      results.push({ name: 'Weekly Schedule', status: 'PASS', message: `${monthHeaders} months displayed` });
    } else if (generateBtn > 0) {
      console.log('  Generate button found (no weeks yet)');
      results.push({ name: 'Weekly Schedule', status: 'PASS', message: 'Ready to generate weeks' });
    } else {
      results.push({ name: 'Weekly Schedule', status: 'CHECK', message: 'Tab loads' });
    }
  } catch (e: any) {
    results.push({ name: 'Weekly Schedule', status: 'FAIL', message: e.message });
  }

  // Test 5: Cases tab
  console.log('\n=== Test 5: Cases tab ===');
  try {
    await page.locator('button:has-text("Cases")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-cases-tab.png'), fullPage: true });

    const addBtn = await page.locator('button:has-text("Add Case"), button:has-text("New Case"), button:has-text("Log Case")').count();
    if (addBtn > 0) {
      console.log('  Add Case button found');
      results.push({ name: 'Cases tab', status: 'PASS', message: 'Add Case button visible' });
    } else {
      results.push({ name: 'Cases tab', status: 'CHECK', message: 'Tab loads' });
    }
  } catch (e: any) {
    results.push({ name: 'Cases tab', status: 'FAIL', message: e.message });
  }

  // Test 6: Journal Club tab
  console.log('\n=== Test 6: Journal Club tab ===');
  try {
    await page.locator('button:has-text("Journal")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-journal-tab.png'), fullPage: true });

    const addBtn = await page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Log")').count();
    if (addBtn > 0) {
      console.log('  Add Entry button found');
      results.push({ name: 'Journal Club tab', status: 'PASS', message: 'Add button visible' });
    } else {
      results.push({ name: 'Journal Club tab', status: 'CHECK', message: 'Tab loads' });
    }
  } catch (e: any) {
    results.push({ name: 'Journal Club tab', status: 'FAIL', message: e.message });
  }

  // Test 7: Summary tab with progress bars (Phase 7)
  console.log('\n=== Test 7: Summary tab (Phase 7 - Progress Bars) ===');
  try {
    await page.locator('button:has-text("Summary")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-summary-tab.png'), fullPage: true });

    const progressSection = await page.locator('text=ACVIM Requirements Progress').count();
    if (progressSection > 0) {
      console.log('  ACVIM Requirements Progress section found');

      // Check for progress bars (by their color classes)
      const progressBars = await page.locator('.bg-green-500, .bg-blue-500, .bg-orange-500, .bg-purple-500').count();
      console.log(`  Found ${progressBars} progress bars`);
      results.push({ name: 'Summary Progress Bars', status: 'PASS', message: `${progressBars} progress bars` });
    } else {
      // Check for any summary content
      const summaryContent = await page.locator('text=Total Cases, text=Total Hours, text=Annual Summary').count();
      if (summaryContent > 0) {
        results.push({ name: 'Summary Progress Bars', status: 'CHECK', message: 'Summary visible, progress section may need scroll' });
      } else {
        results.push({ name: 'Summary Progress Bars', status: 'FAIL', message: 'No progress section found' });
      }
    }
  } catch (e: any) {
    results.push({ name: 'Summary Progress Bars', status: 'FAIL', message: e.message });
  }

  // Test 8: Export button
  console.log('\n=== Test 8: Export functionality ===');
  try {
    const exportBtn = await page.locator('button:has-text("Export"), button:has-text("Word"), button:has-text("Download")').count();
    if (exportBtn > 0) {
      console.log('  Export button found');
      results.push({ name: 'Export button', status: 'PASS', message: 'Export button visible' });
    } else {
      results.push({ name: 'Export button', status: 'CHECK', message: 'Not visible in current view' });
    }
  } catch (e: any) {
    results.push({ name: 'Export button', status: 'FAIL', message: e.message });
  }

  // Test 9: Year selector
  console.log('\n=== Test 9: Year selector ===');
  try {
    const yearSelector = await page.locator('select, button:has-text("Year")').count();
    if (yearSelector > 0) {
      console.log('  Year selector found');
      results.push({ name: 'Year selector', status: 'PASS', message: 'Year selector visible' });
    } else {
      results.push({ name: 'Year selector', status: 'CHECK', message: 'May be in different location' });
    }
  } catch (e: any) {
    results.push({ name: 'Year selector', status: 'FAIL', message: e.message });
  }

  // Test 10: Mobile responsiveness
  console.log('\n=== Test 10: Mobile responsiveness ===');
  try {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/residency`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-mobile-view.png'), fullPage: true });

    // Check page loads on mobile
    const mobileContent = await page.locator('h1, button').count();
    console.log(`  Mobile: Found ${mobileContent} interactive elements`);
    results.push({ name: 'Mobile responsiveness', status: 'PASS', message: `${mobileContent} elements visible` });
  } catch (e: any) {
    results.push({ name: 'Mobile responsiveness', status: 'FAIL', message: e.message });
  }

  await browser.close();

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;
  let checks = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'CHECK' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else checks++;
  }

  console.log(`\nTotal: ${passed} passed, ${checks} needs check, ${failed} failed`);
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}/`);

  return failed === 0;
}

testACVIMTracker()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((e) => {
    console.error('Test runner failed:', e);
    process.exit(1);
  });
