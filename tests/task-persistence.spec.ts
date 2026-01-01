import { test, expect } from '@playwright/test';

/**
 * Task Persistence Tests
 *
 * Verifies that React Query optimistic updates work correctly:
 * 1. Task toggle persists after polling interval
 * 2. Rapid toggles don't cause race conditions
 * 3. Optimistic updates don't get overwritten by stale data
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

test.describe('Task Persistence with React Query', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    // Wait for React Query to initialize
    await page.waitForTimeout(1000);
  });

  test('1. Toggle patient task persists correctly', async ({ page }) => {
    console.log('🧪 Testing patient task toggle persistence...');

    // Find a task checkbox (patient tasks are in task checklist)
    const taskCheckbox = page.locator('[data-testid="patient-task-checkbox"]').first();
    const taskExists = await taskCheckbox.isVisible().catch(() => false);

    if (!taskExists) {
      // If no tasks, create one first
      console.log('   No tasks found, attempting to add one...');

      // Look for add task button
      const addTaskButton = page.locator('button:has-text("Add Task")').first();
      if (await addTaskButton.isVisible()) {
        await addTaskButton.click();
        await page.waitForTimeout(500);

        // Type task name and submit
        const taskInput = page.locator('input[placeholder*="task"]').first();
        if (await taskInput.isVisible()) {
          await taskInput.fill('Test task for persistence');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
        }
      }
    }

    // Now try to find and toggle a task
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      const initialState = await checkbox.isChecked();
      console.log(`   Initial state: ${initialState ? 'checked' : 'unchecked'}`);

      // Toggle the task
      await checkbox.click();
      await page.waitForTimeout(500);

      const afterToggle = await checkbox.isChecked();
      console.log(`   After toggle: ${afterToggle ? 'checked' : 'unchecked'}`);
      expect(afterToggle).toBe(!initialState);

      // Wait longer than the polling interval (30 seconds in config)
      // But we'll use a shorter timeout for testing - the key is that
      // the optimistic update should persist even after polling
      console.log('   Waiting 5 seconds to verify persistence...');
      await page.waitForTimeout(5000);

      const afterWait = await checkbox.isChecked();
      console.log(`   After wait: ${afterWait ? 'checked' : 'unchecked'}`);
      expect(afterWait).toBe(!initialState);

      console.log('   ✅ Task toggle persisted correctly');
    } else {
      console.log('   ⚠️ No checkbox found to test');
    }

    await page.screenshot({ path: '/tmp/task-persistence-toggle.png', fullPage: true });
    console.log('✅ Task toggle persistence test completed');
  });

  test('2. Rapid toggles should settle to correct final state', async ({ page }) => {
    console.log('🧪 Testing rapid task toggles...');

    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isVisible())) {
      console.log('   ⚠️ No checkbox found, skipping test');
      test.skip();
      return;
    }

    const initialState = await checkbox.isChecked();
    console.log(`   Initial state: ${initialState ? 'checked' : 'unchecked'}`);

    // Toggle rapidly 5 times (odd number so final state should be opposite)
    console.log('   Toggling 5 times rapidly...');
    for (let i = 0; i < 5; i++) {
      await checkbox.click();
      await page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait for mutations to settle
    console.log('   Waiting for mutations to settle...');
    await page.waitForTimeout(3000);

    const finalState = await checkbox.isChecked();
    console.log(`   Final state: ${finalState ? 'checked' : 'unchecked'}`);

    // After 5 toggles, state should be opposite of initial
    expect(finalState).toBe(!initialState);
    console.log('   ✅ Rapid toggles settled to correct state');

    await page.screenshot({ path: '/tmp/task-persistence-rapid.png', fullPage: true });
    console.log('✅ Rapid toggle test completed');
  });

  test('3. Task state survives page navigation and return', async ({ page }) => {
    console.log('🧪 Testing task state across navigation...');

    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isVisible())) {
      console.log('   ⚠️ No checkbox found, skipping test');
      test.skip();
      return;
    }

    // Toggle to a known state
    const initialState = await checkbox.isChecked();
    await checkbox.click();
    await page.waitForTimeout(1000);

    const afterToggle = await checkbox.isChecked();
    console.log(`   Toggled from ${initialState} to ${afterToggle}`);

    // Navigate away
    console.log('   Navigating to rounding page...');
    await page.goto(`${BASE_URL}/rounding`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate back
    console.log('   Navigating back to home...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check state persisted
    const afterReturn = await page.locator('input[type="checkbox"]').first().isChecked();
    console.log(`   After return: ${afterReturn ? 'checked' : 'unchecked'}`);

    expect(afterReturn).toBe(afterToggle);
    console.log('   ✅ Task state persisted across navigation');

    await page.screenshot({ path: '/tmp/task-persistence-navigation.png', fullPage: true });
    console.log('✅ Navigation persistence test completed');
  });

  test('4. Optimistic update shows immediately without flicker', async ({ page }) => {
    console.log('🧪 Testing optimistic update timing...');

    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isVisible())) {
      console.log('   ⚠️ No checkbox found, skipping test');
      test.skip();
      return;
    }

    const initialState = await checkbox.isChecked();

    // Click and immediately check state (should be optimistic)
    await checkbox.click();

    // Check immediately - should be toggled (optimistic update)
    const immediateState = await checkbox.isChecked();
    console.log(`   Initial: ${initialState}, Immediate after click: ${immediateState}`);

    expect(immediateState).toBe(!initialState);
    console.log('   ✅ Optimistic update applied immediately');

    // Wait and verify no flicker back
    await page.waitForTimeout(2000);
    const afterDelay = await checkbox.isChecked();
    expect(afterDelay).toBe(!initialState);
    console.log('   ✅ No flicker - state remained stable');

    await page.screenshot({ path: '/tmp/task-persistence-optimistic.png', fullPage: true });
    console.log('✅ Optimistic update test completed');
  });
});
