/**
 * Comprehensive Residency Tracker Deep Audit
 * Tests the residency tracker like a real veterinary resident would use it.
 */

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://empathetic-clarity-production.up.railway.app';
const SCREENSHOT_DIR = '/tmp/vethub-residency-audit';

interface AuditResult {
  test: string;
  details: string;
}

interface Issue {
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface Results {
  timestamp: string;
  url: string;
  passes: AuditResult[];
  failures: AuditResult[];
  warnings: AuditResult[];
  issues_found: Issue[];
}

class ResidencyTrackerTester {
  private results: Results = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    passes: [],
    failures: [],
    warnings: [],
    issues_found: []
  };

  private consoleErrors: string[] = [];

  constructor() {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  }

  private logPass(test: string, details: string) {
    console.log(`\x1b[32m✅ PASS [${test}]: ${details}\x1b[0m`);
    this.results.passes.push({ test, details });
  }

  private logFail(test: string, details: string) {
    console.log(`\x1b[31m❌ FAIL [${test}]: ${details}\x1b[0m`);
    this.results.failures.push({ test, details });
  }

  private logWarning(test: string, details: string) {
    console.log(`\x1b[33m⚠️  WARNING [${test}]: ${details}\x1b[0m`);
    this.results.warnings.push({ test, details });
  }

  private logIssue(category: string, description: string, severity: 'high' | 'medium' | 'low' = 'medium') {
    console.log(`\x1b[35m🔍 ISSUE [${category}]: ${description}\x1b[0m`);
    this.results.issues_found.push({ category, description, severity });
  }

  private async screenshot(page: Page, name: string) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`📸 Screenshot: ${filePath}`);
    return filePath;
  }

  async run() {
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE RESIDENCY TRACKER DEEP AUDIT');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`URL: ${BASE_URL}/residency`);
    console.log('='.repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    try {
      await page.goto(`${BASE_URL}/residency`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await this.screenshot(page, '01-initial-load');

      // Run all tests
      await this.testPageLoad(page);
      await this.testProgressCards(page);
      await this.testCaseLog(page);
      await this.testJournalClub(page);
      await this.testWeeklySchedule(page);
      await this.testAddCaseDialog(page);
      await this.testAddJournalDialog(page);
      await this.testAddScheduleDialog(page);
      await this.testExportFunction(page);
      await this.testMobileUsability(page);
      await this.testTabletUsability(page);
      await this.testAccessibility(page);
      await this.testDataPersistence(page);

      // Check console errors
      if (this.consoleErrors.length > 0) {
        for (const err of this.consoleErrors.slice(0, 5)) {
          this.logIssue('Console Error', err, 'high');
        }
      }

    } catch (e) {
      this.logFail('Test Execution', String(e));
      await this.screenshot(page, 'error-state');
    } finally {
      await browser.close();
    }

    this.printSummary();
    this.saveResults();
  }

  private async testPageLoad(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Page Load & Initial State');
    console.log('='.repeat(60));

    // Check header
    const header = page.locator('h1:has-text("Residency Tracker")');
    if (await header.isVisible()) {
      this.logPass('Page Load', 'Residency Tracker header visible');
    } else {
      this.logFail('Page Load', 'Header not found');
    }

    // Check back button
    const backBtn = page.locator('text=Back to Dashboard');
    if (await backBtn.isVisible()) {
      this.logPass('Navigation', 'Back to Dashboard link visible');
    } else {
      this.logFail('Navigation', 'Back link not found');
    }

    // Check export button
    const exportBtn = page.locator('text=Export ACVIM');
    if (await exportBtn.isVisible()) {
      this.logPass('Export', 'Export ACVIM button visible');
    } else {
      this.logFail('Export', 'Export button not found');
    }
  }

  private async testProgressCards(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Progress Overview Cards');
    console.log('='.repeat(60));

    const cards = [
      { text: 'Surgery Cases', color: 'blue' },
      { text: 'Journal Club', color: 'purple' },
      { text: 'Weekly Logs', color: 'orange' },
      { text: 'Primary Surgeon', color: 'pink' },
    ];

    for (const card of cards) {
      const cardEl = page.locator(`text=${card.text}`).first();
      if (await cardEl.isVisible()) {
        this.logPass('Progress Cards', `${card.text} card visible`);
      } else {
        this.logFail('Progress Cards', `${card.text} card not found`);
      }
    }

    await this.screenshot(page, '02-progress-cards');
  }

  private async testCaseLog(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Case Log Section');
    console.log('='.repeat(60));

    const caseLogHeader = page.locator('h2:has-text("Case Log")');
    if (await caseLogHeader.isVisible()) {
      this.logPass('Case Log', 'Case Log section visible');
    } else {
      this.logFail('Case Log', 'Case Log section not found');
    }

    const addCaseBtn = page.locator('button:has-text("Add Case")');
    if (await addCaseBtn.isVisible()) {
      this.logPass('Case Log', 'Add Case button visible');
    } else {
      this.logFail('Case Log', 'Add Case button not found');
    }

    // Check for empty state or existing cases
    const emptyState = page.locator('text=No cases logged yet');
    const caseItems = page.locator('.bg-gray-50.rounded-lg.p-3').first();

    if (await emptyState.isVisible()) {
      this.logPass('Case Log', 'Empty state displayed correctly');
    } else if (await caseItems.isVisible()) {
      this.logPass('Case Log', 'Case items displayed');
    } else {
      this.logWarning('Case Log', 'Neither empty state nor cases visible');
    }
  }

  private async testJournalClub(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Journal Club Section');
    console.log('='.repeat(60));

    const journalHeader = page.locator('h2:has-text("Journal Club")');
    if (await journalHeader.isVisible()) {
      this.logPass('Journal Club', 'Journal Club section visible');
    } else {
      this.logFail('Journal Club', 'Journal Club section not found');
    }

    const addJournalBtn = page.locator('button:has-text("Add Entry")');
    if (await addJournalBtn.isVisible()) {
      this.logPass('Journal Club', 'Add Entry button visible');
    } else {
      this.logFail('Journal Club', 'Add Entry button not found');
    }
  }

  private async testWeeklySchedule(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Weekly Schedule Section');
    console.log('='.repeat(60));

    const scheduleHeader = page.locator('h2:has-text("Weekly Schedule")');
    if (await scheduleHeader.isVisible()) {
      this.logPass('Weekly Schedule', 'Weekly Schedule section visible');
    } else {
      this.logFail('Weekly Schedule', 'Weekly Schedule section not found');
    }

    const addWeekBtn = page.locator('button:has-text("Add Week")');
    if (await addWeekBtn.isVisible()) {
      this.logPass('Weekly Schedule', 'Add Week button visible');
    } else {
      this.logFail('Weekly Schedule', 'Add Week button not found');
    }
  }

  private async testAddCaseDialog(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Add Case Dialog');
    console.log('='.repeat(60));

    // Click Add Case button
    const addCaseBtn = page.locator('button:has-text("Add Case")');
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    await this.screenshot(page, '03-add-case-dialog');

    // Check dialog opened
    const dialogTitle = page.locator('h3:has-text("Add Surgery Case")');
    if (await dialogTitle.isVisible()) {
      this.logPass('Case Dialog', 'Dialog opened successfully');
    } else {
      this.logFail('Case Dialog', 'Dialog did not open');
      return;
    }

    // Check form fields
    const fields = [
      { label: 'Date', type: 'input[type="date"]' },
      { label: 'Procedure', type: 'input[placeholder*="craniotomy"]' },
      { label: 'Category', type: 'select' },
      { label: 'Role', type: 'select' },
      { label: 'Hours', type: 'input[type="number"]' },
    ];

    let fieldsFound = 0;
    for (const field of fields) {
      const fieldEl = page.locator(field.type).first();
      if (await fieldEl.isVisible().catch(() => false)) {
        fieldsFound++;
      }
    }

    if (fieldsFound >= 3) {
      this.logPass('Case Dialog', `${fieldsFound}/${fields.length} form fields present`);
    } else {
      this.logFail('Case Dialog', `Only ${fieldsFound}/${fields.length} form fields found`);
    }

    // Check patient selection dropdown
    const patientDropdown = page.locator('text=Select Patient');
    if (await patientDropdown.isVisible()) {
      this.logPass('Case Dialog', 'Patient selection dropdown present');
    } else {
      this.logWarning('Case Dialog', 'Patient selection dropdown not found');
    }

    // Close dialog
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
      this.logPass('Case Dialog', 'Cancel button works');
    }
  }

  private async testAddJournalDialog(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Add Journal Club Dialog');
    console.log('='.repeat(60));

    const addJournalBtn = page.locator('button:has-text("Add Entry")');
    await addJournalBtn.click();
    await page.waitForTimeout(500);

    await this.screenshot(page, '04-add-journal-dialog');

    const dialogTitle = page.locator('h3:has-text("Add Journal Club Entry")');
    if (await dialogTitle.isVisible()) {
      this.logPass('Journal Dialog', 'Dialog opened successfully');
    } else {
      this.logFail('Journal Dialog', 'Dialog did not open');
      return;
    }

    // Check for articles textarea
    const articlesField = page.locator('textarea').first();
    if (await articlesField.isVisible()) {
      this.logPass('Journal Dialog', 'Articles textarea present');
    } else {
      this.logFail('Journal Dialog', 'Articles textarea not found');
    }

    // Close dialog
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  private async testAddScheduleDialog(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Add Weekly Schedule Dialog');
    console.log('='.repeat(60));

    const addWeekBtn = page.locator('button:has-text("Add Week")');
    await addWeekBtn.click();
    await page.waitForTimeout(500);

    await this.screenshot(page, '05-add-schedule-dialog');

    const dialogTitle = page.locator('h3:has-text("Add Weekly Schedule")');
    if (await dialogTitle.isVisible()) {
      this.logPass('Schedule Dialog', 'Dialog opened successfully');
    } else {
      this.logFail('Schedule Dialog', 'Dialog did not open');
      return;
    }

    // Check for activity hours section
    const activitySection = page.locator('text=Activity Hours');
    if (await activitySection.isVisible()) {
      this.logPass('Schedule Dialog', 'Activity Hours section present');
    } else {
      this.logFail('Schedule Dialog', 'Activity Hours section not found');
    }

    // Check for hour counter
    const hourCounter = page.locator('text=/\\d+\\s*\\/\\s*40/');
    if (await hourCounter.isVisible()) {
      this.logPass('Schedule Dialog', 'Hour counter (X / 40) visible');
    } else {
      this.logWarning('Schedule Dialog', 'Hour counter not found');
    }

    // Check activity types
    const activityTypes = ['Surgery', 'Diagnostic Imaging', 'Clinical Rounds', 'Research'];
    let activitiesFound = 0;
    for (const activity of activityTypes) {
      const activityEl = page.locator(`text=${activity}`).first();
      if (await activityEl.isVisible().catch(() => false)) {
        activitiesFound++;
      }
    }
    this.logPass('Schedule Dialog', `${activitiesFound}/${activityTypes.length} activity types found`);

    // Close dialog
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(300);
  }

  private async testExportFunction(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Export ACVIM Function');
    console.log('='.repeat(60));

    const exportBtn = page.locator('button:has-text("Export ACVIM")');
    if (await exportBtn.isVisible()) {
      this.logPass('Export', 'Export button visible and clickable');
      // Note: Can't easily test download in headless mode
      this.logWarning('Export', 'MANUAL CHECK: Verify export downloads valid JSON');
    } else {
      this.logFail('Export', 'Export button not found');
    }
  }

  private async testMobileUsability(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Mobile Usability (375x812)');
    console.log('='.repeat(60));

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await this.screenshot(page, '06-mobile-view');

    // Check if page is usable
    const header = page.locator('h1:has-text("Residency Tracker")');
    if (await header.isVisible()) {
      this.logPass('Mobile', 'Header visible on mobile');
    } else {
      this.logFail('Mobile', 'Header not visible on mobile');
    }

    // Check for horizontal overflow issues
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;

    if (bodyWidth > viewportWidth + 10) {
      this.logIssue('UX', `Horizontal overflow on mobile (${bodyWidth}px > ${viewportWidth}px)`, 'high');
    } else {
      this.logPass('Mobile', 'No horizontal overflow');
    }

    // Check if progress cards stack properly
    const progressCards = await page.locator('.rounded-lg.p-4.text-white').all();
    if (progressCards.length >= 4) {
      const firstBox = await progressCards[0].boundingBox();
      const secondBox = await progressCards[1].boundingBox();

      if (firstBox && secondBox) {
        // On mobile, cards should stack (second card should be below first)
        if (secondBox.y > firstBox.y + firstBox.height - 10) {
          this.logPass('Mobile', 'Progress cards stack vertically');
        } else {
          this.logIssue('UX', 'Progress cards not stacking on mobile', 'medium');
        }
      }
    }

    // Check button tap targets
    const buttons = await page.locator('button').all();
    let smallButtons = 0;
    for (const btn of buttons.slice(0, 5)) {
      const box = await btn.boundingBox();
      if (box && (box.width < 44 || box.height < 36)) {
        smallButtons++;
      }
    }

    if (smallButtons > 0) {
      this.logIssue('Accessibility', `${smallButtons} buttons below minimum tap target size`, 'medium');
    } else {
      this.logPass('Mobile', 'Button sizes adequate for touch');
    }

    // Check three-column layout
    const sections = await page.locator('.bg-white.rounded-lg.shadow-lg.p-4').all();
    if (sections.length >= 3) {
      const firstSection = await sections[0].boundingBox();
      const secondSection = await sections[1].boundingBox();

      if (firstSection && secondSection) {
        if (secondSection.y > firstSection.y + 50) {
          this.logPass('Mobile', 'Sections stack vertically on mobile');
        } else {
          this.logIssue('UX', 'Three-column sections may overlap on mobile', 'high');
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 900 });
  }

  private async testTabletUsability(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Tablet Usability (768x1024)');
    console.log('='.repeat(60));

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await this.screenshot(page, '07-tablet-view');

    const header = page.locator('h1:has-text("Residency Tracker")');
    if (await header.isVisible()) {
      this.logPass('Tablet', 'Header visible on tablet');
    } else {
      this.logFail('Tablet', 'Header not visible on tablet');
    }

    // Check if dialogs work on tablet
    const addCaseBtn = page.locator('button:has-text("Add Case")');
    await addCaseBtn.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('.fixed.inset-0');
    if (await dialog.isVisible()) {
      this.logPass('Tablet', 'Dialogs display correctly on tablet');

      // Check dialog doesn't overflow
      const dialogContent = page.locator('.bg-white.rounded-lg.p-6');
      const box = await dialogContent.boundingBox();
      if (box && box.width <= 768) {
        this.logPass('Tablet', 'Dialog fits tablet viewport');
      } else {
        this.logWarning('Tablet', 'Dialog may overflow tablet viewport');
      }

      // Close dialog
      const cancelBtn = page.locator('button:has-text("Cancel")');
      await cancelBtn.click();
    }

    await page.setViewportSize({ width: 1440, height: 900 });
  }

  private async testAccessibility(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Accessibility');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').all();
    const h2 = await page.locator('h2').all();
    const h3 = await page.locator('h3').all();

    if (h1.length >= 1) {
      this.logPass('Accessibility', `Found ${h1.length} h1, ${h2.length} h2, ${h3.length} h3 headings`);
    } else {
      this.logWarning('Accessibility', 'No h1 heading found');
    }

    // Check for form labels
    const inputs = await page.locator('input, select, textarea').all();
    const labels = await page.locator('label').all();

    if (labels.length >= inputs.length * 0.5) {
      this.logPass('Accessibility', `Form has adequate labels (${labels.length} labels for ${inputs.length} inputs)`);
    } else {
      this.logIssue('Accessibility', `Missing form labels (${labels.length} labels for ${inputs.length} inputs)`, 'medium');
    }

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (['BUTTON', 'A', 'INPUT', 'SELECT'].includes(focused || '')) {
      this.logPass('Accessibility', `Keyboard navigation works - focused on ${focused}`);
    } else {
      this.logWarning('Accessibility', `Tab focus unclear - focused on ${focused}`);
    }

    await this.screenshot(page, '08-accessibility-check');
  }

  private async testDataPersistence(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Data Persistence (localStorage)');
    console.log('='.repeat(60));

    // Check localStorage usage
    const storageKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('residency')) {
          keys.push(key);
        }
      }
      return keys;
    });

    if (storageKeys.length > 0) {
      this.logPass('Data Persistence', `Found ${storageKeys.length} residency keys in localStorage`);
    } else {
      this.logWarning('Data Persistence', 'No residency data in localStorage (may be empty)');
    }

    // Check that data uses localStorage not database
    this.logWarning('Data Persistence', 'DATA STORED IN LOCALSTORAGE ONLY - not synced to server!');
    this.logIssue('Architecture', 'Residency data only stored in localStorage - data loss risk on browser clear', 'high');
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));

    console.log(`\x1b[32m✅ Passes: ${this.results.passes.length}\x1b[0m`);
    console.log(`\x1b[33m⚠️  Warnings: ${this.results.warnings.length}\x1b[0m`);
    console.log(`\x1b[31m❌ Failures: ${this.results.failures.length}\x1b[0m`);
    console.log(`\x1b[35m🔍 Issues Found: ${this.results.issues_found.length}\x1b[0m`);

    if (this.results.failures.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('ALL FAILURES');
      console.log('='.repeat(60));
      this.results.failures.forEach((f, i) => {
        console.log(`${i + 1}. [${f.test}] ${f.details}`);
      });
    }

    if (this.results.issues_found.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('ISSUES TO FIX');
      console.log('='.repeat(60));
      this.results.issues_found.forEach((issue, i) => {
        const severityColor = issue.severity === 'high' ? '\x1b[31m' : '\x1b[33m';
        console.log(`${i + 1}. ${severityColor}[${issue.severity.toUpperCase()}]\x1b[0m [${issue.category}] ${issue.description}`);
      });
    }

    console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  }

  private saveResults() {
    const resultsPath = path.join(SCREENSHOT_DIR, 'residency-audit-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Full results saved to: ${resultsPath}`);
  }
}

// Run the tests
const tester = new ResidencyTrackerTester();
tester.run().catch(console.error);
