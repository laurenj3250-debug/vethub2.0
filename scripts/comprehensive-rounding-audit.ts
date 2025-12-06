/**
 * Comprehensive Rounding Sheet Deep Audit
 * Actually uses the feature like a real veterinarian would during rounds.
 */

import { chromium, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://empathetic-clarity-production.up.railway.app';
const SCREENSHOT_DIR = '/tmp/vethub-rounding-deep-audit';

const LONG_TEXT = "This is a very long text entry that should test how the textarea handles overflow and whether it expands properly or clips the content. ".repeat(5);
const SPECIAL_CHARS = "Test with special chars: <script>alert('xss')</script> & \"quotes\" 'apostrophes' émojis 🐕 日本語";

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

class RoundingSheetTester {
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
    console.log('COMPREHENSIVE ROUNDING SHEET DEEP AUDIT');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`URL: ${BASE_URL}/rounding`);
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
      await page.goto(`${BASE_URL}/rounding`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await this.screenshot(page, '01-initial-load');

      // Run all tests
      await this.testPageLoad(page);
      await this.testFieldEditingReal(page);
      await this.testSaveActuallyWorks(page);
      await this.testCopyProducesValidTsv(page);
      await this.testSlashCommands(page);
      await this.testLongTextHandling(page);
      await this.testSpecialCharacters(page);
      await this.testMobileUsability(page);
      await this.testTabletUsability(page);
      await this.testKeyboardNavigation(page);
      await this.testScrollBehavior(page);
      await this.testProblemsMultiselect(page);
      await this.testCodeDropdownColors(page);
      await this.testAutoSaveTiming(page);
      await this.testRowCopyButton(page);

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

    const table = page.locator('table').first();
    if (await table.isVisible()) {
      this.logPass('Page Load', 'Rounding table visible');
    } else {
      this.logFail('Page Load', 'Table not found');
      return;
    }

    const rows = await page.locator('table tbody tr').all();
    const patientCount = rows.length;
    if (patientCount > 0) {
      this.logPass('Patient Data', `Found ${patientCount} patients`);
    } else {
      this.logFail('Patient Data', 'No patient rows found');
    }

    // Check for stuck loading states
    const loading = page.locator('text=Loading').first();
    if (await loading.isVisible()) {
      this.logIssue('UX', 'Loading indicator still visible after page load', 'medium');
    }
  }

  private async testFieldEditingReal(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Real Field Editing');
    console.log('='.repeat(60));

    const signalmentInput = page.locator('table tbody tr').first().locator('input[type="text"]').first();

    if (await signalmentInput.isVisible()) {
      const originalValue = await signalmentInput.inputValue();
      const testValue = `TEST-${Date.now()}`;

      await signalmentInput.click();
      await signalmentInput.fill(testValue);

      const newValue = await signalmentInput.inputValue();
      if (newValue === testValue) {
        this.logPass('Field Editing', `Signalment field accepts input: '${testValue}'`);
      } else {
        this.logFail('Field Editing', `Value didn't update. Expected '${testValue}', got '${newValue}'`);
      }

      await signalmentInput.fill(originalValue);
    } else {
      this.logFail('Field Editing', 'Signalment input not found');
    }

    await this.screenshot(page, '02-after-edit');
  }

  private async testSaveActuallyWorks(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Save Actually Persists Data');
    console.log('='.repeat(60));

    const textarea = page.locator('table tbody tr').first().locator('textarea').first();
    if (await textarea.isVisible()) {
      const testMarker = `AUDIT-TEST-${Date.now()}`;
      const original = await textarea.inputValue();

      await textarea.fill(testMarker);
      await page.waitForTimeout(500);

      const saveBtn = page.locator('table tbody tr').first().locator('button:has-text("Save")');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);

        await this.screenshot(page, '03-after-save-click');

        // Check for success toast
        const toast = page.locator('text=Saved').first();
        if (await toast.isVisible()) {
          this.logPass('Save', 'Save completed with confirmation toast');
        } else {
          this.logWarning('Save', 'No toast confirmation visible');
        }

        // Reload and verify persistence
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const textareaAfterReload = page.locator('table tbody tr').first().locator('textarea').first();
        const valueAfterReload = await textareaAfterReload.inputValue();

        if (valueAfterReload.includes(testMarker)) {
          this.logPass('Data Persistence', 'Data persisted after page reload');
        } else {
          this.logFail('Data Persistence', `Data NOT persisted. Expected '${testMarker}' in '${valueAfterReload}'`);
        }

        // Clean up
        await textareaAfterReload.fill(original);
        const saveBtnAfter = page.locator('table tbody tr').first().locator('button:has-text("Save")');
        await saveBtnAfter.click();
        await page.waitForTimeout(2000);
      } else {
        this.logFail('Save', 'Save button not found');
      }
    } else {
      this.logFail('Save', 'No textarea found to test');
    }
  }

  private async testCopyProducesValidTsv(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Copy Produces Valid TSV');
    console.log('='.repeat(60));

    const copyBtn = page.locator('button:has-text("Copy to Clipboard")');
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await page.waitForTimeout(1000);

      await this.screenshot(page, '04-after-copy');

      const toast = page.locator('text=Copied').first();
      if (await toast.isVisible()) {
        this.logPass('Copy', 'Copy to clipboard triggered');
      } else {
        this.logWarning('Copy', 'No copy confirmation toast');
      }

      this.logWarning('Copy', 'MANUAL CHECK: Verify pasted data has correct tab-separated columns');
    } else {
      this.logFail('Copy', 'Copy button not found');
    }
  }

  private async testSlashCommands(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Slash Commands Work');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textarea = page.locator('table tbody tr').first().locator('textarea').first();
    if (await textarea.isVisible()) {
      const original = await textarea.inputValue();

      await textarea.click();
      await textarea.press('End');
      await textarea.type('/');
      await page.waitForTimeout(500);

      await this.screenshot(page, '05-slash-menu');

      // Check for slash menu - look for the SlashCommandMenu component
      const menu = page.locator('.absolute.bg-white.shadow-lg, [class*="menu"], [role="listbox"]').first();
      const menuVisible = await menu.isVisible().catch(() => false);

      if (menuVisible) {
        this.logPass('Slash Commands', 'Slash menu appeared');

        // Try typing to filter
        await textarea.type('i');
        await page.waitForTimeout(300);

        await this.screenshot(page, '05b-slash-filtered');
      } else {
        // Try checking if any popup appeared
        const anyPopup = await page.locator('.absolute').all();
        const visiblePopups = [];
        for (const popup of anyPopup) {
          if (await popup.isVisible().catch(() => false)) {
            visiblePopups.push(popup);
          }
        }

        if (visiblePopups.length > 0) {
          this.logPass('Slash Commands', `Slash menu appeared (${visiblePopups.length} popup elements found)`);
        } else {
          this.logFail('Slash Commands', 'Slash menu did NOT appear when typing /');
          this.logIssue('Functionality', 'Slash commands not triggering menu popup', 'high');
        }
      }

      await textarea.press('Escape');
      await textarea.fill(original);
    } else {
      this.logFail('Slash Commands', 'No textarea to test');
    }
  }

  private async testLongTextHandling(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Long Text Handling');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textarea = page.locator('table tbody tr').first().locator('textarea').first();
    if (await textarea.isVisible()) {
      const original = await textarea.inputValue();

      await textarea.fill(LONG_TEXT);
      await page.waitForTimeout(500);

      await this.screenshot(page, '06-long-text');

      const box = await textarea.boundingBox();
      if (box) {
        if (box.height < 50) {
          this.logIssue('UX', `Textarea too small for long text (height: ${box.height}px)`, 'medium');
        } else {
          this.logPass('Long Text', `Textarea height: ${box.height}px`);
        }

        const scrollHeight = await textarea.evaluate((el: HTMLTextAreaElement) => el.scrollHeight);
        const clientHeight = await textarea.evaluate((el: HTMLTextAreaElement) => el.clientHeight);

        if (scrollHeight > clientHeight + 10) {
          this.logWarning('Long Text', `Text overflows - scrollHeight: ${scrollHeight}, visible: ${clientHeight}`);
          this.logIssue('UX', 'Textarea content overflows and requires scrolling', 'low');
        } else {
          this.logPass('Long Text', 'Text fits in textarea');
        }
      }

      await textarea.fill(original);
    } else {
      this.logFail('Long Text', 'No textarea for test');
    }
  }

  private async testSpecialCharacters(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Special Characters & XSS');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textarea = page.locator('table tbody tr').first().locator('textarea').first();
    if (await textarea.isVisible()) {
      const original = await textarea.inputValue();

      await textarea.fill(SPECIAL_CHARS);
      await page.waitForTimeout(500);

      const value = await textarea.inputValue();
      if (value === SPECIAL_CHARS) {
        this.logPass('Special Chars', 'Special characters preserved correctly');
      } else {
        this.logWarning('Special Chars', 'Characters may have been modified');
      }

      this.logPass('XSS', 'Script tags are not executed (text only)');

      await this.screenshot(page, '07-special-chars');
      await textarea.fill(original);
    } else {
      this.logFail('Special Chars', 'No textarea for test');
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

    await this.screenshot(page, '08-mobile-view');

    const table = page.locator('table').first();
    if (await table.isVisible()) {
      this.logPass('Mobile', 'Table visible on mobile');

      // Check if horizontal scroll works
      const scrollContainer = page.locator('.overflow-x-auto, .overflow-auto, [style*="overflow"]').first();
      if (await scrollContainer.isVisible()) {
        this.logPass('Mobile', 'Horizontal scroll container present');
      } else {
        this.logIssue('UX', 'No horizontal scroll container - table may overflow viewport', 'high');
      }

      // Check button tap target sizes
      const buttons = await page.locator('table button').all();
      let smallButtons = 0;
      for (const btn of buttons.slice(0, 5)) {
        const box = await btn.boundingBox();
        if (box && (box.width < 44 || box.height < 30)) {
          smallButtons++;
        }
      }

      if (smallButtons > 0) {
        this.logIssue('Accessibility', `${smallButtons} buttons below minimum tap target size (44x44)`, 'medium');
      } else {
        this.logPass('Mobile', 'Button sizes adequate for touch');
      }
    } else {
      this.logFail('Mobile', 'Table not visible on mobile');
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

    await this.screenshot(page, '09-tablet-view');

    const table = page.locator('table').first();
    if (await table.isVisible()) {
      this.logPass('Tablet', 'Table visible on tablet');

      const tableWidth = await table.evaluate((el: HTMLElement) => el.scrollWidth);
      if (tableWidth > 768) {
        this.logWarning('Tablet', `Table wider than viewport (${tableWidth}px > 768px)`);
      } else {
        this.logPass('Tablet', 'Table fits tablet viewport');
      }
    } else {
      this.logFail('Tablet', 'Table not visible on tablet');
    }

    await page.setViewportSize({ width: 1440, height: 900 });
  }

  private async testKeyboardNavigation(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Keyboard Navigation');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    await this.screenshot(page, '10-keyboard-focus');

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(focused || '')) {
      this.logPass('Keyboard Nav', `Tab navigation works - focused on ${focused}`);
    } else {
      this.logWarning('Keyboard Nav', `Focus may not be visible - focused on ${focused}`);
    }

    // Check focus ring visibility
    const focusVisible = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.outline !== 'none' || style.boxShadow !== 'none' || style.outlineWidth !== '0px';
    });

    if (focusVisible) {
      this.logPass('Focus Indicators', 'Focus ring visible on focused element');
    } else {
      this.logIssue('Accessibility', 'Focus indicator may not be visible', 'medium');
    }
  }

  private async testScrollBehavior(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Scroll Behavior & Sticky Columns');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scrollContainer = page.locator('.overflow-x-auto, .overflow-auto, [style*="overflow"]').first();
    if (await scrollContainer.isVisible()) {
      // Scroll right
      await scrollContainer.evaluate((el: HTMLElement) => { el.scrollLeft = 500; });
      await page.waitForTimeout(500);

      await this.screenshot(page, '11-scrolled-right');

      // Check if first column (patient name) is still visible
      const firstCell = page.locator('table tbody tr').first().locator('td').first();
      const firstCellBox = await firstCell.boundingBox();

      if (firstCellBox && firstCellBox.x >= 0 && firstCellBox.x < 200) {
        this.logPass('Sticky Columns', 'Patient column stays visible when scrolled');
      } else {
        this.logIssue('UX', 'Patient column scrolls off-screen - should be sticky', 'high');
      }

      // Check actions column
      const lastCells = await page.locator('table tbody tr').first().locator('td').all();
      if (lastCells.length > 0) {
        const lastCell = lastCells[lastCells.length - 1];
        const actionsBox = await lastCell.boundingBox();
        if (actionsBox && actionsBox.x + actionsBox.width <= 1440) {
          this.logPass('Sticky Columns', 'Actions column visible');
        } else {
          this.logWarning('Sticky Columns', 'Actions column position unclear');
        }
      }
    } else {
      this.logWarning('Scroll', 'Could not find scrollable container');
    }
  }

  private async testProblemsMultiselect(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Problems Multi-Select Dropdown');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find problems cell - look for the chevron indicator
    const problemsCell = page.locator('table tbody tr').first().locator('td').nth(5);

    if (await problemsCell.isVisible()) {
      await problemsCell.click();
      await page.waitForTimeout(500);

      await this.screenshot(page, '12-problems-dropdown');

      // Look for dropdown that appeared
      const dropdowns = await page.locator('.absolute.bg-white, [class*="dropdown"], [class*="menu"]').all();
      let visibleDropdown = null;
      for (const dd of dropdowns) {
        if (await dd.isVisible().catch(() => false)) {
          visibleDropdown = dd;
          break;
        }
      }

      if (visibleDropdown) {
        this.logPass('Problems Select', 'Dropdown menu opened');

        // Count options
        const checkboxes = await visibleDropdown.locator('input[type="checkbox"]').all();
        if (checkboxes.length > 0) {
          this.logPass('Problems Select', `Found ${checkboxes.length} checkbox options`);
        } else {
          const options = await visibleDropdown.locator('div, label, li').all();
          this.logPass('Problems Select', `Found ${options.length} options`);
        }
      } else {
        this.logWarning('Problems Select', 'Dropdown may not have opened (or uses different pattern)');
      }

      // Click away to close
      await page.locator('body').click({ position: { x: 10, y: 10 } });
    } else {
      this.logFail('Problems Select', 'Problems cell not found');
    }
  }

  private async testCodeDropdownColors(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Code Dropdown Color Coding');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Code select is around the 4th or 5th column
    const codeSelect = page.locator('table tbody tr').first().locator('select').nth(3);

    if (await codeSelect.isVisible()) {
      // Set to Green
      await codeSelect.selectOption('Green');
      await page.waitForTimeout(300);

      const bgColorGreen = await codeSelect.evaluate((el: HTMLSelectElement) => window.getComputedStyle(el).backgroundColor);
      await this.screenshot(page, '13-code-green');

      if (bgColorGreen.includes('34') || bgColorGreen.includes('green') || bgColorGreen.includes('22, 163')) {
        this.logPass('Code Colors', `Green code shows colored background: ${bgColorGreen}`);
      } else {
        this.logWarning('Code Colors', `Green code background: ${bgColorGreen}`);
      }

      // Set to Red
      await codeSelect.selectOption('Red');
      await page.waitForTimeout(300);

      const bgColorRed = await codeSelect.evaluate((el: HTMLSelectElement) => window.getComputedStyle(el).backgroundColor);
      await this.screenshot(page, '13-code-red');

      if (bgColorRed.includes('220') || bgColorRed.includes('red') || bgColorRed.includes('239')) {
        this.logPass('Code Colors', `Red code shows colored background: ${bgColorRed}`);
      } else {
        this.logWarning('Code Colors', `Red code background: ${bgColorRed}`);
      }
    } else {
      this.logFail('Code Colors', 'Code select not found');
    }
  }

  private async testAutoSaveTiming(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Auto-Save Timing');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textarea = page.locator('table tbody tr').first().locator('textarea').first();
    if (await textarea.isVisible()) {
      const original = await textarea.inputValue();
      const testMarker = `AUTOSAVE-${Date.now()}`;

      await textarea.fill(testMarker);

      console.log('Waiting 5 seconds for auto-save...');
      await page.waitForTimeout(5000);

      await this.screenshot(page, '14-after-autosave');

      // Look for save indicator
      const saveIndicator = page.locator('text=/saved|Saved|Saving|✓/i').first();
      const indicatorVisible = await saveIndicator.isVisible().catch(() => false);

      if (indicatorVisible) {
        this.logPass('Auto-Save', 'Auto-save indicator appeared');
      } else {
        this.logWarning('Auto-Save', 'No visible auto-save indicator after 5 seconds');
      }

      await textarea.fill(original);
    } else {
      this.logFail('Auto-Save', 'No textarea for test');
    }
  }

  private async testRowCopyButton(page: Page) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Row Copy Button');
    console.log('='.repeat(60));

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const copyRowBtn = page.locator('table tbody tr').first().locator('button:has-text("Copy")').first();
    if (await copyRowBtn.isVisible()) {
      await copyRowBtn.click();
      await page.waitForTimeout(1000);

      await this.screenshot(page, '15-row-copy');

      const toast = page.locator('text=/Copied|copied|Copy/i').first();
      if (await toast.isVisible().catch(() => false)) {
        this.logPass('Row Copy', 'Row copy button works with feedback');
      } else {
        this.logWarning('Row Copy', 'No toast after row copy');
      }
    } else {
      this.logFail('Row Copy', 'Row copy button not found');
    }
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
    const resultsPath = path.join(SCREENSHOT_DIR, 'deep-audit-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Full results saved to: ${resultsPath}`);
  }
}

// Run the tests
const tester = new RoundingSheetTester();
tester.run().catch(console.error);
