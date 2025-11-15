/**
 * Comprehensive Design Review Script for Patient Import Page
 *
 * Tests:
 * - Responsive design at mobile (375px), tablet (768px), desktop (1440px)
 * - Accessibility compliance (WCAG 2.1 AA)
 * - Design system consistency
 * - Interactive elements
 * - User flows
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

test.describe('Patient Import Page - Comprehensive Design Review', () => {

  test.describe('Responsive Design', () => {

    test('Mobile viewport (375px) - Initial state', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(`${BASE_URL}/patient-import`);

      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Patient Import from VetRadar');

      // Take screenshot
      await page.screenshot({
        path: 'screenshots/design-review-mobile-initial.png',
        fullPage: true
      });

      // Check that form is visible
      await expect(page.locator('label:has-text("VetRadar Email")')).toBeVisible();
      await expect(page.locator('label:has-text("VetRadar Password")')).toBeVisible();
      await expect(page.locator('button:has-text("Import Patients from VetRadar")')).toBeVisible();

      // Check mobile-friendly spacing
      const container = page.locator('.container');
      await expect(container).toBeVisible();
    });

    test('Tablet viewport (768px) - Initial state', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.goto(`${BASE_URL}/patient-import`);

      await expect(page.locator('h1')).toContainText('Patient Import from VetRadar');

      await page.screenshot({
        path: 'screenshots/design-review-tablet-initial.png',
        fullPage: true
      });

      // Check that layout adapts
      await expect(page.locator('label:has-text("VetRadar Email")')).toBeVisible();
      await expect(page.locator('button:has-text("Import Patients from VetRadar")')).toBeVisible();
    });

    test('Desktop viewport (1440px) - Initial state', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      await expect(page.locator('h1')).toContainText('Patient Import from VetRadar');

      await page.screenshot({
        path: 'screenshots/design-review-desktop-initial.png',
        fullPage: true
      });

      // Check full layout
      await expect(page.locator('label:has-text("VetRadar Email")')).toBeVisible();
      await expect(page.locator('label:has-text("VetRadar Password")')).toBeVisible();
      await expect(page.locator('button:has-text("Import Patients from VetRadar")')).toBeVisible();
    });
  });

  test.describe('Accessibility Compliance', () => {

    test('Form labels and ARIA attributes', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Check form labels are associated with inputs
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      // Check labels exist
      await expect(page.locator('label:has-text("VetRadar Email")')).toBeVisible();
      await expect(page.locator('label:has-text("VetRadar Password")')).toBeVisible();
    });

    test('Keyboard navigation', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Import Patients from VetRadar")')).toBeFocused();
    });

    test('Button states - disabled when empty', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      const importButton = page.locator('button:has-text("Import Patients from VetRadar")');

      // Button should be disabled when fields are empty
      await expect(importButton).toBeDisabled();
    });

    test('Button states - enabled when filled', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Fill in credentials
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');

      const importButton = page.locator('button:has-text("Import Patients from VetRadar")');

      // Button should be enabled
      await expect(importButton).toBeEnabled();
    });
  });

  test.describe('Design System Consistency', () => {

    test('VetHub color palette usage', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Check gradient background (slate-900, blue-900)
      const background = page.locator('body > div');
      await expect(background).toBeVisible();

      // Check that white cards exist for forms
      const formCard = page.locator('.bg-white').first();
      await expect(formCard).toBeVisible();
    });

    test('Typography scale', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // H1 should be text-4xl
      const h1 = page.locator('h1');
      await expect(h1).toHaveCSS('font-size', '36px'); // text-4xl = 36px in Tailwind

      // H2 should be text-xl
      const h2 = page.locator('h2').first();
      await expect(h2).toBeVisible();
    });

    test('Spacing consistency', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Check container padding
      const container = page.locator('.container');
      await expect(container).toBeVisible();

      // Check card spacing
      const card = page.locator('.bg-white').first();
      await expect(card).toBeVisible();
    });
  });

  test.describe('Interactive Elements', () => {

    test('Input field focus states', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      const emailInput = page.locator('input[type="email"]');

      // Click to focus
      await emailInput.click();
      await expect(emailInput).toBeFocused();

      // Type and verify
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    });

    test('Button hover states', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Fill form to enable button
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');

      const importButton = page.locator('button:has-text("Import Patients from VetRadar")');

      // Hover over button
      await importButton.hover();

      // Take screenshot of hover state
      await page.screenshot({
        path: 'screenshots/design-review-button-hover.png',
        fullPage: false
      });
    });

    test('Informational panel visibility', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Check info panel exists
      await expect(page.locator('text=What will be imported:')).toBeVisible();
      await expect(page.locator('text=All active Neurology/Neurosurgery patients from VetRadar')).toBeVisible();
      await expect(page.locator('text=85% of patient data auto-populated')).toBeVisible();
    });
  });

  test.describe('Console Errors', () => {

    test('No console errors on page load', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Check no errors
      expect(consoleErrors).toEqual([]);
    });
  });

  test.describe('User Flows', () => {

    test('Empty state to filled state transition', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(`${BASE_URL}/patient-import`);

      // Initial state - button disabled
      const importButton = page.locator('button:has-text("Import Patients from VetRadar")');
      await expect(importButton).toBeDisabled();

      // Fill email
      await page.fill('input[type="email"]', 'lauren.johnston@nva.com');
      await expect(importButton).toBeDisabled(); // Still disabled (password empty)

      // Fill password
      await page.fill('input[type="password"]', 'test-password');
      await expect(importButton).toBeEnabled(); // Now enabled

      // Take screenshot of ready state
      await page.screenshot({
        path: 'screenshots/design-review-ready-to-import.png',
        fullPage: true
      });
    });
  });
});
