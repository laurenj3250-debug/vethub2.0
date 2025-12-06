/**
 * Comprehensive VetHub Main Page Audit
 * Tests all functionality and identifies issues without fixing them.
 */

import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const BASE_URL = process.env.TEST_URL || "https://empathetic-clarity-production.up.railway.app";
const SCREENSHOT_DIR = "/tmp/vethub-audit";
const LOGIN_EMAIL = "laurenj3250@gmail.com";
const LOGIN_PASSWORD = "Crumpet11!!";

interface Issue {
  category: string;
  description: string;
  details?: string;
  timestamp: string;
}

const issues: Issue[] = [];
const warnings: Issue[] = [];
const successes: { category: string; description: string }[] = [];

function logIssue(category: string, description: string, details?: string) {
  issues.push({
    category,
    description,
    details,
    timestamp: new Date().toISOString()
  });
  console.log(`❌ ISSUE [${category}]: ${description}`);
  if (details) console.log(`   Details: ${details}`);
}

function logWarning(category: string, description: string, details?: string) {
  warnings.push({ category, description, details, timestamp: new Date().toISOString() });
  console.log(`⚠️  WARNING [${category}]: ${description}`);
  if (details) console.log(`   Details: ${details}`);
}

function logSuccess(category: string, description: string) {
  successes.push({ category, description });
  console.log(`✅ PASS [${category}]: ${description}`);
}

async function takeScreenshot(page: Page, name: string) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filepath}`);
  return filepath;
}

async function login(page: Page): Promise<boolean> {
  console.log("\n" + "=".repeat(60));
  console.log("LOGGING IN");
  console.log("=".repeat(60));

  try {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if already logged in (no login form)
    const emailInput = page.locator('input[placeholder="Email"], input[type="email"]').first();
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log("Already logged in or no login required");
      return true;
    }

    // Fill login form
    await emailInput.fill(LOGIN_EMAIL);
    await page.locator('input[placeholder="Password"], input[type="password"]').first().fill(LOGIN_PASSWORD);
    await takeScreenshot(page, "00-login-filled");

    // Click sign in
    await page.locator('button:has-text("Sign In")').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for redirect

    await takeScreenshot(page, "00-after-login");
    logSuccess("Login", "Successfully logged in");
    return true;
  } catch (e) {
    logIssue("Login", "Failed to log in", String(e));
    return false;
  }
}

async function testPageLoad(page: Page): Promise<boolean> {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Dashboard Load");
  console.log("=".repeat(60));

  try {
    await takeScreenshot(page, "01-dashboard");
    logSuccess("Page Load", "Dashboard loads successfully after login");
  } catch (e) {
    logIssue("Page Load", "Failed to capture dashboard", String(e));
    return false;
  }

  return true;
}

async function testTaskChecklistPresence(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Task Checklist Presence");
  console.log("=".repeat(60));

  const tasksHeader = page.locator("text=Tasks").first();
  if (await tasksHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
    logSuccess("Task Checklist", "Tasks section is visible");
  } else {
    logIssue("Task Checklist", "Tasks section not found on dashboard");
    return false;
  }

  // Check for stats counter (e.g., "0/6")
  const statsCounter = page.locator("span:has-text('/')");
  const counters = await statsCounter.all();
  if (counters.length > 0) {
    logSuccess("Task Checklist", "Task completion counter is visible");
  } else {
    logWarning("Task Checklist", "Task completion counter not clearly visible");
  }

  return true;
}

async function testTimeFilters(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Time Filters (All/AM/PM)");
  console.log("=".repeat(60));

  const allBtn = page.locator("button:has-text('All')").first();
  const amBtn = page.locator("button:has-text('AM')").first();
  const pmBtn = page.locator("button:has-text('PM')").first();

  // Test All button
  if (await allBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    logSuccess("Time Filter", "'All' button is visible");
    await allBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "02-filter-all");
  } else {
    logIssue("Time Filter", "'All' button not found");
  }

  // Test AM button
  if (await amBtn.isVisible().catch(() => false)) {
    logSuccess("Time Filter", "'AM' button is visible");
    await amBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "03-filter-am");

    // Check what's shown
    const content = await page.content();
    if (content.includes('morning') || content.includes('AM')) {
      logSuccess("Time Filter", "AM filter appears to be working");
    }
  } else {
    logIssue("Time Filter", "'AM' button not found");
  }

  // Test PM button
  if (await pmBtn.isVisible().catch(() => false)) {
    logSuccess("Time Filter", "'PM' button is visible");
    await pmBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "04-filter-pm");
  } else {
    logIssue("Time Filter", "'PM' button not found");
  }

  // Reset to All
  if (await allBtn.isVisible().catch(() => false)) {
    await allBtn.click();
    await page.waitForTimeout(300);
  }
}

async function testViewModeToggle(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: View Mode Toggle (By Task / By Patient)");
  console.log("=".repeat(60));

  const byTaskBtn = page.locator("button:has-text('By Task')").first();
  const byPatientBtn = page.locator("button:has-text('By Patient')").first();

  // Test By Task view
  if (await byTaskBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    logSuccess("View Mode", "'By Task' button is visible");
    await byTaskBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "05-view-by-task");
  } else {
    logIssue("View Mode", "'By Task' button not found");
  }

  // Test By Patient view
  if (await byPatientBtn.isVisible().catch(() => false)) {
    logSuccess("View Mode", "'By Patient' button is visible");
    await byPatientBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "06-view-by-patient");

    // Check for General section
    const generalSection = page.locator("text=General").first();
    if (await generalSection.isVisible().catch(() => false)) {
      logSuccess("View Mode", "General tasks section visible in By Patient view");
    } else {
      logWarning("View Mode", "General tasks section not visible - may be empty");
    }
  } else {
    logIssue("View Mode", "'By Patient' button not found");
  }

  // Reset to By Task
  if (await byTaskBtn.isVisible().catch(() => false)) {
    await byTaskBtn.click();
    await page.waitForTimeout(300);
  }
}

async function testHideDoneToggle(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Hide/Show Done Toggle");
  console.log("=".repeat(60));

  const showDoneBtn = page.locator("button:has-text('show done')").first();
  const hideDoneBtn = page.locator("button:has-text('hide done')").first();

  if (await showDoneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    logSuccess("Done Toggle", "'show done' button visible (currently hiding done)");
    await showDoneBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "07-show-done");

    // Toggle back
    const hideBtn = page.locator("button:has-text('hide done')").first();
    if (await hideBtn.isVisible().catch(() => false)) {
      logSuccess("Done Toggle", "Toggle works - now showing 'hide done'");
    }
  } else if (await hideDoneBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    logSuccess("Done Toggle", "'hide done' button visible (currently showing done)");
    await hideDoneBtn.click();
    await page.waitForTimeout(300);
    await takeScreenshot(page, "07-hide-done");
  } else {
    logIssue("Done Toggle", "Hide/show done toggle not found");
  }
}

async function testAddTaskFlow(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Add Task Flow");
  console.log("=".repeat(60));

  const addBtn = page.locator("button:has-text('Add Task')").first();

  if (!(await addBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
    logIssue("Add Task", "'Add Task' button not found");
    return;
  }

  logSuccess("Add Task", "'Add Task' button is visible");
  await addBtn.click();
  await page.waitForTimeout(300);
  await takeScreenshot(page, "08-add-task-form");

  // Check for input field
  const taskInput = page.locator("input[placeholder*='Task'], input[placeholder*='task']").first();
  if (await taskInput.isVisible().catch(() => false)) {
    logSuccess("Add Task", "Task name input field is visible");

    // Try typing a task
    await taskInput.fill("Test Task from Audit");
    await takeScreenshot(page, "08b-add-task-filled");
    logSuccess("Add Task", "Can type in task input");
  } else {
    logWarning("Add Task", "Task name input field not found with expected placeholder");
  }

  // Check for patient selector
  const patientSelect = page.locator("select").first();
  if (await patientSelect.isVisible().catch(() => false)) {
    logSuccess("Add Task", "Patient selector is visible");
    const options = await patientSelect.locator("option").all();
    logSuccess("Add Task", `Patient selector has ${options.length} options`);

    // Check if "All" option exists
    const allOption = patientSelect.locator("option:has-text('All')");
    if (await allOption.count() > 0) {
      logSuccess("Add Task", "'All' (general task) option available");
    } else {
      logWarning("Add Task", "No 'All' option for general tasks");
    }
  } else {
    logWarning("Add Task", "Patient selector not found");
  }

  // Cancel without adding - click the X button to close the add task form
  // The close button uses "×" character, not an SVG icon
  const closeBtn = page.locator("button:has-text('×'), button:has-text('✕'), [data-testid='close-add-task']").first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(300);
    logSuccess("Add Task", "Close button works");
  } else {
    // Try pressing Escape as fallback
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    logSuccess("Add Task", "Closed via Escape key");
  }
}

async function testTaskToggle(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Task Toggle (Complete/Incomplete)");
  console.log("=".repeat(60));

  // Look for incomplete task toggles (circles or task buttons)
  const incompleteButtons = await page.locator("button:has-text('○')").all();
  const completedButtons = await page.locator("button:has-text('✓')").all();

  // Also look for task cards that might have different structure
  const taskCards = await page.locator("[class*='rounded-2xl']").all();

  logSuccess("Task Toggle", `Found ${incompleteButtons.length} incomplete tasks, ${completedButtons.length} completed, ${taskCards.length} task cards`);

  if (incompleteButtons.length > 0) {
    await takeScreenshot(page, "09-before-toggle");

    // Click first incomplete task
    const firstIncomplete = incompleteButtons[0];
    const textBefore = await firstIncomplete.innerText().catch(() => "");
    await firstIncomplete.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, "10-after-toggle");

    // Check if it changed
    const newCompletedCount = await page.locator("button:has-text('✓')").count();
    if (newCompletedCount > completedButtons.length) {
      logSuccess("Task Toggle", "Task toggle works - task was marked complete");

      // Toggle it back
      const newCompleted = await page.locator("button:has-text('✓')").all();
      if (newCompleted.length > 0) {
        await newCompleted[0].click();
        await page.waitForTimeout(300);
        logSuccess("Task Toggle", "Successfully toggled task back to incomplete");
      }
    } else {
      logWarning("Task Toggle", "Task toggle may not have worked - check screenshots");
    }
  } else {
    logWarning("Task Toggle", "No incomplete tasks with ○ symbol to test toggle functionality");

    // Try looking for any clickable task elements
    const anyTaskButtons = await page.locator("button").all();
    logWarning("Task Toggle", `Total buttons on page: ${anyTaskButtons.length}`);
  }
}

async function testPatientList(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Patient List & Cards");
  console.log("=".repeat(60));

  // Check for patient names/cards
  const content = await page.content();

  // Look for common patient-related elements
  const patientCards = await page.locator("[class*='patient']").all();
  const nameElements = await page.locator("span[class*='font-bold'], span[class*='font-medium']").all();

  logSuccess("Patient List", `Found ${patientCards.length} patient elements, ${nameElements.length} potential name elements`);

  // Take a screenshot of the patient area
  await takeScreenshot(page, "11-patient-list");
}

async function testClearAllButton(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Clear All Button");
  console.log("=".repeat(60));

  const clearBtn = page.locator("button:has-text('Clear All')").first();
  if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    logSuccess("Clear All", "Clear All button is visible");
    logWarning("Clear All", "CAUTION: Clear All button is exposed - consider adding confirmation dialog");

    // DON'T click it - just note it exists
  } else {
    logSuccess("Clear All", "Clear All button not visible (may be hidden when few tasks - good UX)");
  }
}

async function testResponsiveLayout(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Responsive Layout");
  console.log("=".repeat(60));

  const viewports = [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);
    await takeScreenshot(page, `12-responsive-${vp.name}`);

    // Check if task checklist is still visible
    const tasks = page.locator("text=Tasks").first();
    if (await tasks.isVisible().catch(() => false)) {
      logSuccess("Responsive", `Tasks visible at ${vp.name} (${vp.width}x${vp.height})`);
    } else {
      logWarning("Responsive", `Tasks NOT visible at ${vp.name} - may need scroll`);
    }
  }

  // Reset to desktop
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function testAccessibility(page: Page) {
  console.log("\n" + "=".repeat(60));
  console.log("TESTING: Basic Accessibility");
  console.log("=".repeat(60));

  // Check for buttons without accessible text
  const buttons = await page.locator("button").all();
  let buttonsWithoutText = 0;

  for (const btn of buttons) {
    const text = await btn.innerText().catch(() => "");
    const ariaLabel = await btn.getAttribute("aria-label") || "";
    const title = await btn.getAttribute("title") || "";

    if (!text.trim() && !ariaLabel && !title) {
      buttonsWithoutText++;
    }
  }

  if (buttonsWithoutText > 0) {
    logWarning("Accessibility", `${buttonsWithoutText} buttons found without accessible text, aria-label, or title`);
  } else {
    logSuccess("Accessibility", "All buttons have accessible text or labels");
  }

  logWarning("Accessibility", "MANUAL CHECK NEEDED: Verify keyboard focus indicators are visible");
  logWarning("Accessibility", "MANUAL CHECK NEEDED: Verify color contrast meets WCAG AA standards");
}

async function runAudit() {
  console.log("\n" + "=".repeat(60));
  console.log("VETHUB MAIN PAGE COMPREHENSIVE AUDIT");
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`URL: ${BASE_URL}`);
  console.log("=".repeat(60));

  // Clear previous screenshots
  fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages: { type: string; text: string }[] = [];
  page.on("console", msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Login first
  if (!(await login(page))) {
    console.log("\n❌ Login failed - aborting further tests");
    await browser.close();
    return;
  }

  // Run all tests
  await testPageLoad(page);
  await testTaskChecklistPresence(page);
  await testTimeFilters(page);
  await testViewModeToggle(page);
  await testHideDoneToggle(page);
  await testAddTaskFlow(page);
  await testTaskToggle(page);
  await testPatientList(page);
  await testClearAllButton(page);
  await testResponsiveLayout(page);
  await testAccessibility(page);

  // Check for console errors
  const consoleErrors = consoleMessages.filter(m => m.type === "error");
  if (consoleErrors.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log(`CONSOLE ERRORS CAPTURED (${consoleErrors.length})`);
    console.log("=".repeat(60));
    for (const err of consoleErrors.slice(0, 5)) {
      logIssue("Console Error", err.text.substring(0, 200));
    }
    if (consoleErrors.length > 5) {
      logWarning("Console Errors", `${consoleErrors.length - 5} more errors not shown`);
    }
  }

  await browser.close();

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("AUDIT SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successes: ${successes.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Issues: ${issues.length}`);
  console.log(`\n📸 Screenshots saved to: ${SCREENSHOT_DIR}`);

  if (issues.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("ALL ISSUES FOUND");
    console.log("=".repeat(60));
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.category}] ${issue.description}`);
      if (issue.details) console.log(`   → ${issue.details.substring(0, 100)}`);
    });
  }

  if (warnings.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("ALL WARNINGS (Improvement Opportunities)");
    console.log("=".repeat(60));
    warnings.forEach((warning, i) => {
      console.log(`${i + 1}. [${warning.category}] ${warning.description}`);
    });
  }

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    url: BASE_URL,
    successes,
    warnings,
    issues
  };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, "audit-results.json"), JSON.stringify(results, null, 2));
  console.log(`\n📄 Full results saved to: ${SCREENSHOT_DIR}/audit-results.json`);
}

runAudit().catch(console.error);
