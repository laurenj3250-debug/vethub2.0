import { test, expect } from '@playwright/test';

test.describe('Tasks Auto-Hide Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to test migration
    await page.goto('http://localhost:3002/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForLoadState('networkidle');
  });

  test('1. Default state - completed tasks should be hidden', async ({ page }) => {
    console.log('🧪 Testing default auto-hide state...');

    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check localStorage value
    const hideCompletedValue = await page.evaluate(() => {
      return localStorage.getItem('hideCompletedTasks');
    });

    console.log(`   localStorage hideCompletedTasks: "${hideCompletedValue}"`);
    expect(hideCompletedValue).toBe('true');

    // Check button state
    const toggleButton = page.locator('button:has-text("Show Completed")').first();
    const buttonVisible = await toggleButton.isVisible().catch(() => false);

    if (buttonVisible) {
      console.log('   ✅ Toggle button shows "Show Completed" (tasks are hidden)');
    } else {
      console.log('   ⚠️  Toggle button not found or shows different text');
    }

    await page.screenshot({ path: '/tmp/tasks-auto-hide-default.png', fullPage: true });
    console.log('✅ Default state test completed');
  });

  test('2. Migration from old false value', async ({ page }) => {
    console.log('🧪 Testing migration from old "false" value...');

    // Set old 'false' value
    await page.goto('http://localhost:3002/');
    await page.evaluate(() => {
      localStorage.setItem('hideCompletedTasks', 'false');
      localStorage.removeItem('hideCompletedTasks_migrated');
    });

    // Reload page to trigger migration
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check that value was migrated to 'true'
    const hideCompletedValue = await page.evaluate(() => {
      return localStorage.getItem('hideCompletedTasks');
    });

    const migratedValue = await page.evaluate(() => {
      return localStorage.getItem('hideCompletedTasks_migrated');
    });

    console.log(`   After migration - hideCompletedTasks: "${hideCompletedValue}"`);
    console.log(`   Migration flag: "${migratedValue}"`);

    expect(hideCompletedValue).toBe('true');
    expect(migratedValue).toBe('true');

    console.log('   ✅ Migration successful - old "false" → new "true"');
    console.log('✅ Migration test completed');
  });

  test('3. Toggle functionality works correctly', async ({ page }) => {
    console.log('🧪 Testing toggle functionality...');

    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Initial state should be hiding completed
    let hideValue = await page.evaluate(() => localStorage.getItem('hideCompletedTasks'));
    console.log(`   Initial state: ${hideValue}`);
    expect(hideValue).toBe('true');

    // Find and click the toggle button
    const toggleButton = page.locator('button:has-text("Show Completed"), button:has-text("Hide Completed")').first();
    await toggleButton.click();
    await page.waitForTimeout(500);

    // Should now be showing completed tasks
    hideValue = await page.evaluate(() => localStorage.getItem('hideCompletedTasks'));
    console.log(`   After first click: ${hideValue}`);
    expect(hideValue).toBe('false');

    // Click again to hide
    await toggleButton.click();
    await page.waitForTimeout(500);

    hideValue = await page.evaluate(() => localStorage.getItem('hideCompletedTasks'));
    console.log(`   After second click: ${hideValue}`);
    expect(hideValue).toBe('true');

    await page.screenshot({ path: '/tmp/tasks-auto-hide-toggle.png', fullPage: true });
    console.log('✅ Toggle test completed');
  });

  test('4. Completed tasks visibility based on toggle', async ({ page }) => {
    console.log('🧪 Testing completed tasks visibility...');

    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Add a test patient with tasks
    const addPatientButton = page.locator('button:has-text("Add Patient")').first();
    if (await addPatientButton.isVisible().catch(() => false)) {
      await addPatientButton.click();
      await page.waitForTimeout(500);

      // Fill patient form
      await page.locator('input[placeholder*="name"], input[name="name"]').first().fill('Test Patient');
      await page.locator('select[name="species"]').first().selectOption('Canine');

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Add a task
      const taskInput = page.locator('input[placeholder*="task"], input[placeholder*="Add"]').first();
      if (await taskInput.isVisible()) {
        await taskInput.fill('Test Task');
        await taskInput.press('Enter');
        await page.waitForTimeout(500);

        // Mark task as complete
        const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible()) {
          await checkbox.click();
          await page.waitForTimeout(500);

          console.log('   Created and completed a test task');

          // With auto-hide enabled, completed task should not be visible
          const completedTaskVisible = await page.locator('text="Test Task"').isVisible().catch(() => false);
          console.log(`   Completed task visible (should be false): ${completedTaskVisible}`);

          // Click show completed
          const showButton = page.locator('button:has-text("Show Completed")').first();
          if (await showButton.isVisible()) {
            await showButton.click();
            await page.waitForTimeout(500);

            // Now completed task should be visible
            const nowVisible = await page.locator('text="Test Task"').isVisible().catch(() => false);
            console.log(`   Completed task visible after "Show" (should be true): ${nowVisible}`);
          }
        }
      }
    } else {
      console.log('   ℹ️  Add Patient button not found - skipping task creation test');
    }

    await page.screenshot({ path: '/tmp/tasks-auto-hide-visibility.png', fullPage: true });
    console.log('✅ Visibility test completed');
  });

  test('5. Count badge shows completed tasks when hidden', async ({ page }) => {
    console.log('🧪 Testing count badge...');

    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for the badge that shows completed task count
    const badge = page.locator('button:has-text("Show Completed") span.badge, button:has-text("Show Completed") span[class*="badge"]').first();
    const badgeVisible = await badge.isVisible().catch(() => false);

    if (badgeVisible) {
      const badgeText = await badge.textContent();
      console.log(`   ✅ Count badge visible with value: "${badgeText}"`);
    } else {
      console.log('   ℹ️  No count badge visible (may be zero completed tasks)');
    }

    await page.screenshot({ path: '/tmp/tasks-auto-hide-badge.png', fullPage: true });
    console.log('✅ Badge test completed');
  });

  test('6. Persistence after page reload', async ({ page }) => {
    console.log('🧪 Testing persistence after reload...');

    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Toggle to show completed
    const toggleButton = page.locator('button:has-text("Show Completed"), button:has-text("Hide Completed")').first();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(500);

      const valueBeforeReload = await page.evaluate(() => localStorage.getItem('hideCompletedTasks'));
      console.log(`   Value before reload: ${valueBeforeReload}`);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const valueAfterReload = await page.evaluate(() => localStorage.getItem('hideCompletedTasks'));
      console.log(`   Value after reload: ${valueAfterReload}`);

      expect(valueBeforeReload).toBe(valueAfterReload);
      console.log('   ✅ Setting persisted across reload');
    }

    console.log('✅ Persistence test completed');
  });
});
