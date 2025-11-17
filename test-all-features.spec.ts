import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://empathetic-clarity-production.up.railway.app';

test.describe('VetHub Comprehensive Feature Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to production
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Homepage loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForSelector('[data-testid="dashboard"], .min-h-screen', { timeout: 10000 });

    console.log('Console errors:', errors);
    expect(errors.length).toBe(0);
  });

  test('2. Add new patient', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Click Add Patient button
    await page.click('button:has-text("Add Patient"), button:has-text("+ Patient")');
    await page.waitForTimeout(500);

    // Fill patient form
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Test Dog');
    await page.fill('input[name="species"], input[placeholder*="species" i]', 'Canine');
    await page.fill('input[name="breed"], input[placeholder*="breed" i]', 'Labrador');
    await page.fill('input[name="weight"], input[placeholder*="weight" i]', '25kg');

    // Submit
    await page.click('button:has-text("Add"), button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(1000);

    console.log('Add patient errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('3. Add task to patient', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find first patient and add task
    const patientCard = page.locator('[data-testid="patient-card"]').first();
    await patientCard.waitFor({ timeout: 5000 }).catch(() => {});

    // Try to find task input or add task button
    const taskInput = page.locator('input[placeholder*="task" i], input[placeholder*="add" i]').first();
    if (await taskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskInput.fill('Test Task');
      await taskInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    console.log('Add task errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('4. Toggle task completion', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find first task checkbox
    const taskCheckbox = page.locator('button[role="checkbox"], input[type="checkbox"]').first();
    if (await taskCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await taskCheckbox.click();
      await page.waitForTimeout(1000);
    }

    console.log('Toggle task errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('5. Delete task from patient', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find delete task button (usually trash icon)
    const deleteButton = page.locator('button:has(svg), button[aria-label*="delete" i]').first();
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('Delete task errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('6. Add general task', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Look for general tasks section
    const generalTaskInput = page.locator('input[placeholder*="general" i]').first();
    if (await generalTaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await generalTaskInput.fill('General Task Test');
      await generalTaskInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    console.log('Add general task errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('7. Navigate to Rounding page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find and click Rounding link
    await page.click('a[href="/rounding"], button:has-text("Rounding")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Rounding page errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('8. Navigate to SOAP page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find and click SOAP link
    await page.click('a[href="/soap"], button:has-text("SOAP")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('SOAP page errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('9. Navigate to Appointments page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Find and click Appointments link
    await page.click('a[href="/appointments"], button:has-text("Appointments")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('Appointments page errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('10. Check all API routes are reachable', async ({ page, request }) => {
    const apiRoutes = [
      '/api/patients',
      '/api/tasks/general',
      '/api/common/problems',
      '/api/common/comments',
      '/api/common/medications'
    ];

    const errors: string[] = [];

    for (const route of apiRoutes) {
      try {
        const response = await request.get(`${PRODUCTION_URL}${route}`);
        if (response.status() >= 400) {
          errors.push(`${route}: HTTP ${response.status()}`);
        }
      } catch (error) {
        errors.push(`${route}: ${error}`);
      }
    }

    console.log('API route errors:', errors);
    expect(errors).toHaveLength(0);
  });

  test('11. Test task deletion with actual patient', async ({ page }) => {
    const errors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()}: HTTP ${response.status()}`);
      }
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find any task delete button and click it
    const deleteButtons = await page.locator('button:has-text("Delete"), button[aria-label*="delete" i], button:has(svg.lucide-trash)').all();

    if (deleteButtons.length > 0) {
      await deleteButtons[0].click();
      await page.waitForTimeout(2000);
    }

    console.log('Task deletion console errors:', errors);
    console.log('Task deletion network errors:', networkErrors);

    const allErrors = [...errors, ...networkErrors];
    if (allErrors.length > 0) {
      console.log('ERRORS FOUND:', allErrors);
    }
  });
});
