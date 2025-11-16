/**
 * VetRadar Web Scraper
 *
 * Integrates with VetRadar anesthesia and treatment monitoring system.
 * Uses Playwright to scrape treatment sheets and patient data.
 *
 * Note: This is a web scraping implementation. If VetRadar provides an API,
 * that should be used instead for better reliability and performance.
 */

import { chromium, Browser, Page } from 'playwright';

export interface VetRadarPatient {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age: string;
  sex: string;
  weight: number;
  location: string;
  status: string;
  cage_location?: string;
  ward?: string;
  criticalNotes?: string[];
  treatments?: string[];
  medications?: VetRadarTreatment[];
  issues?: string[];
  patientId?: string;      // Patient ID from VetRadar (e.g., "674131")
  clientId?: string;       // Client/Owner ID (if available)
  consultNumber?: string;  // Consult number (e.g., "5877395")
}

export interface VetRadarTreatment {
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  time?: string;
}

export interface VetRadarFluid {
  type: string;
  rate: string;
  units: string;
}

export interface VetRadarTreatmentSheet {
  patientId: string;
  patientName: string;
  species: string;
  age: string;
  sex: string;
  weight: number;
  location: string;
  medications: VetRadarTreatment[];
  fluids: VetRadarFluid[];
  vitals?: {
    temperature?: number;
    heartRate?: number;
    respiratoryRate?: number;
    timestamp?: string;
  }[];
  nursingNotes?: string;
  concerns?: string;
}

export interface VetRadarSession {
  browser: Browser;
  page: Page;
}

export class VetRadarScraper {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VETRADAR_BASE_URL || 'https://app.vetradar.com';
  }

  /**
   * Helper: Wait for page to fully load before interacting
   * ALWAYS use this before looking for buttons or elements
   */
  private async waitForPageLoad(page: Page, description: string = 'page') {
    console.log(`[VetRadar] Waiting for ${description} to fully load...`);
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log(`[VetRadar] Network idle timeout on ${description}, continuing anyway...`);
    });
    console.log(`[VetRadar] ${description} loaded`);
  }

  /**
   * Login to VetRadar and create a session
   */
  async login(username: string, password: string): Promise<VetRadarSession> {
    const browser = await chromium.launch({
      headless: true, // Run in headless mode (no visible browser window)
    });

    const page = await browser.newPage();

    try {
      console.log(`[VetRadar] Navigating to ${this.baseUrl}/login`);

      // Navigate to login page with longer timeout
      await page.goto(`${this.baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      console.log('[VetRadar] Waiting for login form...');

      // Wait for the page to be fully loaded
      await page.waitForTimeout(2000);

      // Find all input fields
      const inputs = await page.locator('input').all();
      console.log(`[VetRadar] Found ${inputs.length} input fields`);

      if (inputs.length < 2) {
        throw new Error('Could not find email and password inputs');
      }

      console.log('[VetRadar] Filling in credentials...');

      // Fill in email (first input)
      await inputs[0].fill(username);

      // Fill in password (second input) and press Enter
      await inputs[1].fill(password);
      await inputs[1].press('Enter');

      console.log('[VetRadar] Submitted login form...');

      console.log('[VetRadar] Waiting for navigation...');

      // Wait for navigation to complete (give it more time)
      try {
        await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 45000 });
        console.log('[VetRadar] URL changed - navigation successful');
      } catch (e) {
        console.log('[VetRadar] Timeout waiting for URL change, checking current state...');
      }

      // Give extra time for page to load
      await page.waitForTimeout(3000);

      console.log('[VetRadar] Checking if logged in...');

      // Check if we're on a dashboard or home page (not login page)
      const currentUrl = page.url();
      console.log(`[VetRadar] Current URL: ${currentUrl}`);

      // Handle email verification page
      if (currentUrl.includes('/verify_email')) {
        console.log('[VetRadar] On email verification page - looking for skip button...');

        // WAIT FOR PAGE TO LOAD before looking for buttons
        await this.waitForPageLoad(page, 'verify_email page');

        try {
          // Try to find and click "Skip for 24 Hours" button
          console.log('[VetRadar] Looking for Skip button...');
          let skipped = false;

          try {
            // Try clicking with exact text match
            const skipButton = page.locator('text="Skip for 24 Hours"').first();
            if (await skipButton.isVisible({ timeout: 3000 })) {
              console.log('[VetRadar] Found "Skip for 24 Hours" button');
              await skipButton.click();
              console.log('[VetRadar] Clicked Skip button');
              await page.waitForTimeout(3000);
              skipped = true;
            }
          } catch (e) {
            console.log('[VetRadar] Could not find "Skip for 24 Hours" with exact text');
          }

          // If that didn't work, try partial match
          if (!skipped) {
            try {
              const skipButton = page.locator('text=/skip.*24/i').first();
              if (await skipButton.isVisible({ timeout: 2000 })) {
                console.log('[VetRadar] Found skip button with regex');
                await skipButton.click();
                console.log('[VetRadar] Clicked Skip button');
                await page.waitForTimeout(3000);
                skipped = true;
              }
            } catch (e) {
              console.log('[VetRadar] Could not find skip button with regex');
            }
          }

          // Last resort: click any button containing "skip"
          if (!skipped) {
            try {
              const allButtons = await page.locator('button, a').all();
              console.log(`[VetRadar] Found ${allButtons.length} clickable elements total`);

              for (const btn of allButtons) {
                const text = await btn.textContent().catch(() => '');
                console.log(`[VetRadar] Button text: "${text?.trim()}"`);

                if (text && text.toLowerCase().includes('skip')) {
                  console.log(`[VetRadar] Clicking button with "skip": "${text.trim()}"`);
                  await btn.click();
                  await page.waitForTimeout(3000);
                  skipped = true;
                  break;
                }
              }
            } catch (e) {
              console.log('[VetRadar] Error searching for buttons:', e);
            }
          }

          if (!skipped) {
            console.log('[VetRadar] No skip button found - attempting to navigate directly to patient list...');
            await page.screenshot({ path: 'vetradar-verify-email.png', fullPage: true });

            // Try navigating directly to the patient list page - with retry
            let navigated = false;
            for (let attempt = 0; attempt < 3; attempt++) {
              console.log(`[VetRadar] Navigation attempt ${attempt + 1}/3...`);
              await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
              await page.waitForTimeout(2000);

              const currentUrl = page.url();
              console.log(`[VetRadar] Current URL after navigation: ${currentUrl}`);

              if (!currentUrl.includes('verify_email') && !currentUrl.includes('verify')) {
                console.log('[VetRadar] Successfully navigated away from verification page');
                navigated = true;
                break;
              }

              console.log('[VetRadar] Still on verification page, retrying...');
              await page.waitForTimeout(2000);
            }

            if (!navigated) {
              console.log('[VetRadar] WARNING: Could not navigate away from verification page after 3 attempts');
            }
          } else {
            console.log('[VetRadar] Successfully skipped email verification');
          }
        } catch (e) {
          console.log('[VetRadar] Error handling email verification:', e);
          await page.screenshot({ path: 'vetradar-verify-email-error.png', fullPage: true });

          // Last resort: try direct navigation to patients page
          try {
            console.log('[VetRadar] Trying direct navigation to /patients as fallback...');
            await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            console.log('[VetRadar] Fallback navigation successful');
          } catch (navError) {
            console.log('[VetRadar] Fallback navigation also failed:', navError);
          }
        }
      }

      // Check for verification/PIN inputs on the page (regardless of URL)
      const allInputs = await page.locator('input[type="text"]:visible, input[type="tel"]:visible, input[type="number"]:visible, input:not([type]):visible').all();

      if (allInputs.length >= 5) {
        console.log(`[VetRadar] Found ${allInputs.length} input fields`);

        try {
          // Wait a moment for page to be interactive
          await page.waitForTimeout(2000);

          // Determine if this is email verification (6 digits) or PIN (5 digits)
          // Email verification code: 780419 (6 digits)
          // PIN code: 32597 (5 digits)

          let code: string;
          let numInputs: number;

          if (allInputs.length === 6) {
            console.log('[VetRadar] Detected 6 inputs - entering email verification code...');
            code = '780419';
            numInputs = 6;
          } else if (allInputs.length === 5) {
            console.log('[VetRadar] Detected 5 inputs - entering PIN...');
            code = '32597';
            numInputs = 5;
          } else {
            console.log('[VetRadar] Entering code into first available inputs...');
            code = allInputs.length === 6 ? '780419' : '32597';
            numInputs = Math.min(allInputs.length, code.length);
          }

          // Enter each digit into separate boxes
          console.log(`[VetRadar] Entering ${code.length}-digit code into ${numInputs} boxes...`);
          for (let i = 0; i < numInputs && i < code.length; i++) {
            await allInputs[i].click();
            await allInputs[i].fill(''); // Clear first
            await allInputs[i].type(code[i], { delay: 150 });
            console.log(`[VetRadar] Entered digit ${i + 1}: ${code[i]}`);
            await page.waitForTimeout(200);
          }

          // CRITICAL: Wait for page to fully load before looking for Confirm button
          await this.waitForPageLoad(page, 'PIN page after digit entry');

          // CRITICAL FIX: Try pressing Enter key after PIN entry (common pattern)
          console.log('[VetRadar] Trying Enter key after PIN entry...');
          let enterKeyWorked = false;
          try {
            await page.keyboard.press('Enter');
            console.log('[VetRadar] Pressed Enter key');
            await page.waitForTimeout(2000);

            // Check if navigation happened
            const urlAfterEnter = page.url();
            console.log(`[VetRadar] URL after Enter: ${urlAfterEnter}`);
            if (!urlAfterEnter.includes('set_up_pin')) {
              console.log('[VetRadar] ✓ Enter key worked! Navigated away from PIN page');
              enterKeyWorked = true;
            }
          } catch (e) {
            console.log('[VetRadar] Enter key did not work:', e);
          }

          // Skip button clicking if Enter key already worked
          if (enterKeyWorked) {
            // Continue to next iteration of login check loop
          } else {

          // COMPREHENSIVE DEBUGGING: Check ALL frames for buttons (they might be in iframes!)
          console.log('[VetRadar] === COMPREHENSIVE PAGE SCAN (INCLUDING IFRAMES) ===');
          try {
            // Check for iframes
            const frames = page.frames();
            console.log(`[VetRadar] Found ${frames.length} frames on page`);

            // Check EACH frame for buttons
            for (let i = 0; i < frames.length; i++) {
              const frame = frames[i];
              const frameUrl = frame.url();
              console.log(`[VetRadar] Checking frame ${i}: ${frameUrl}`);

              try {
                const frameButtons = await frame.locator('button').all();
                console.log(`[VetRadar]   Frame ${i} has ${frameButtons.length} buttons`);

                for (const btn of frameButtons) {
                  const text = await btn.textContent().catch(() => '');
                  const visible = await btn.isVisible().catch(() => false);
                  console.log(`[VetRadar]   Frame ${i} button: "${text?.trim()}" | visible=${visible}`);
                }
              } catch (e) {
                console.log(`[VetRadar]   Error scanning frame ${i}:`, e);
              }
            }

            // Also check main page
            const buttons = await page.locator('button').all();
            console.log(`[VetRadar] Main page has ${buttons.length} buttons`);

            // Take screenshot for manual inspection
            await page.screenshot({ path: 'vetradar-pin-page-debug.png', fullPage: true });
            console.log('[VetRadar] Screenshot saved: vetradar-pin-page-debug.png');

          } catch (e) {
            console.log('[VetRadar] Error in comprehensive scan:', e);
          }
          console.log('[VetRadar] === END COMPREHENSIVE SCAN ===');

          // Try to find and click Confirm button (check ALL frames and main page)
          let confirmed = false;

          // NEW APPROACH: Check all frames for the Confirm PIN button
          console.log('[VetRadar] Looking for Confirm PIN button in all frames...');
          const frames = page.frames();
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            try {
              const confirmBtn = frame.locator('button:has-text("Confirm"), button:has-text("confirm"), button:has-text("Confirm PIN")').first();
              if (await confirmBtn.isVisible({ timeout: 1000 })) {
                console.log(`[VetRadar] Found Confirm button in frame ${i}! Clicking...`);
                await confirmBtn.click();
                console.log('[VetRadar] ✓ Clicked Confirm PIN button');
                await page.waitForTimeout(3000);
                confirmed = true;
                break;
              }
            } catch (e) {
              // This frame doesn't have the button, continue to next
              continue;
            }
          }

          // If not found in frames, try main page
          if (!confirmed) {
            try {
              console.log('[VetRadar] Checking main page for Confirm button...');
              const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("confirm"), button:has-text("Confirm PIN")').first();
              await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
              console.log('[VetRadar] Confirm button is visible! Clicking...');
              await confirmBtn.click();
              console.log('[VetRadar] Clicked Confirm button');
              await page.waitForTimeout(3000);
              confirmed = true;
            } catch (e) {
              console.log('[VetRadar] Confirm button not found on main page either...');

              // Maybe button is there but disabled? Try finding it anyway
              try {
                const anyConfirm = await page.locator('button').all();
                console.log(`[VetRadar] Trying to find Confirm in ${anyConfirm.length} total buttons...`);
                for (const btn of anyConfirm) {
                  const text = (await btn.textContent().catch(() => '')) || '';
                  if (text.toLowerCase().includes('confirm')) {
                    console.log(`[VetRadar] Found button with "confirm" text: "${text.trim()}"`);
                    const isDisabled = await btn.isDisabled().catch(() => true);
                    const isVisible = await btn.isVisible().catch(() => false);
                    console.log(`[VetRadar] Button disabled=${isDisabled}, visible=${isVisible}`);
                    if (!isDisabled && isVisible) {
                      await btn.click();
                      console.log('[VetRadar] Clicked Confirm button!');
                      await page.waitForTimeout(3000);
                      confirmed = true;
                      break;
                    }
                  }
                }
              } catch (e2) {
                console.log('[VetRadar] Error searching buttons:', e2);
              }
            }
          }

          // If that didn't work, try other selectors
          if (!confirmed) {
            const confirmSelectors = [
              'button:has-text("Submit")',
              'button:has-text("Continue")',
              'button:has-text("Next")',
              'button:has-text("Done")',
              'button[type="submit"]',
              '[role="button"]:has-text("Confirm")',
            ];

            for (const selector of confirmSelectors) {
              try {
                const confirmBtn = page.locator(selector).first();
                if (await confirmBtn.isVisible({ timeout: 2000 })) {
                  console.log(`[VetRadar] Found button with selector: ${selector}`);
                  await confirmBtn.click({ timeout: 5000 });
                  console.log(`[VetRadar] Clicked button`);
                  await page.waitForTimeout(3000);
                  confirmed = true;
                  break;
                }
              } catch (e) {
                continue;
              }
            }
          }

          // If no specific confirm button, try clicking ANY visible button
          if (!confirmed) {
            console.log('[VetRadar] No standard confirm button found - trying to click any visible button...');
            try {
              const anyButton = await page.locator('button:visible, a:visible, [role="button"]:visible').first();
              if (await anyButton.isVisible({ timeout: 2000 })) {
                const btnText = await anyButton.textContent();
                console.log(`[VetRadar] Clicking first visible button: "${btnText?.trim()}"`);
                await anyButton.click();
                await page.waitForTimeout(3000);
                confirmed = true;
              }
            } catch (e) {
              console.log('[VetRadar] Could not click any button:', e);
            }
          }

          if (confirmed) {
            console.log('[VetRadar] Successfully clicked button after PIN entry');
          } else {
            console.log('[VetRadar] No confirm button found - waiting for auto-submit...');
            // Wait for auto-navigation after PIN entry
            try {
              await page.waitForURL(url => !url.includes('verify_email') && !url.includes('set_up_pin'), { timeout: 10000 });
              console.log(`[VetRadar] PIN auto-submitted, navigated to: ${page.url()}`);
            } catch (e) {
              console.log('[VetRadar] No auto-navigation detected after PIN entry');
            }
          }

          } // End of else block for enterKeyWorked

          // Check if we navigated to PIN setup page after entering verification code
          await page.waitForTimeout(2000);
          const currentUrl = page.url();
          console.log(`[VetRadar] Current URL after code entry: ${currentUrl}`);

          // If we're on set_up_pin page, try to skip first, then enter PIN if needed
          if (currentUrl.includes('/set_up_pin') || currentUrl.includes('/pin')) {
            console.log('[VetRadar] On PIN setup page - looking for skip button first...');

            // FIRST: Try to skip the PIN page
            let skippedPin = false;
            try {
              const skipSelectors = [
                'text="Skip for 24 Hours"',
                'text=/skip.*24/i',
                'button:has-text("Skip")',
                'a:has-text("Skip")',
              ];

              for (const selector of skipSelectors) {
                try {
                  const skipBtn = page.locator(selector).first();
                  if (await skipBtn.isVisible({ timeout: 2000 })) {
                    console.log(`[VetRadar] Found skip button on PIN page: ${selector}`);
                    await skipBtn.click();
                    console.log('[VetRadar] Clicked skip button on PIN page');
                    await page.waitForTimeout(3000);
                    skippedPin = true;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }

              if (!skippedPin) {
                console.log('[VetRadar] No skip button found on PIN page');
              }
            } catch (e) {
              console.log('[VetRadar] Error looking for skip button on PIN page:', e);
            }

            // ONLY enter PIN if we didn't skip
            if (!skippedPin) {
              console.log('[VetRadar] No skip option - checking for PIN inputs...');
              const pinInputs = await page.locator('input:visible').all();
              console.log(`[VetRadar] Found ${pinInputs.length} PIN input fields`);

              if (pinInputs.length >= 5) {
                const pin = '32597';
                console.log('[VetRadar] Entering 5-digit PIN...');
                for (let i = 0; i < 5 && i < pinInputs.length; i++) {
                  await pinInputs[i].click();
                  await pinInputs[i].fill('');
                  await pinInputs[i].type(pin[i], { delay: 150 });
                  console.log(`[VetRadar] Entered PIN digit ${i + 1}: ${pin[i]}`);
                  await page.waitForTimeout(200);
                }

                // Look for confirm button
                try {
                  const confirmBtn = page.locator('button:has-text("Confirm"), button[type="submit"]').first();
                  if (await confirmBtn.isVisible({ timeout: 2000 })) {
                    await confirmBtn.click();
                    console.log('[VetRadar] Clicked confirm button after PIN');
                  }
                } catch (e) {
                  console.log('[VetRadar] No confirm button, waiting for auto-submit...');
                }

                // Wait for auto-navigation after PIN
                await page.waitForTimeout(2000);
                try {
                  await page.waitForURL(url => !url.includes('pin') && !url.includes('verify'), { timeout: 10000 });
                  console.log(`[VetRadar] PIN accepted, navigated to: ${page.url()}`);
                } catch (e) {
                  console.log('[VetRadar] No auto-navigation after PIN');
                }
              }
            } else {
              console.log('[VetRadar] Skipped PIN page successfully');
            }
          }

          // If still on verify/pin pages, force navigation to patients page
          await page.waitForTimeout(2000);
          if (page.url().includes('verify') || page.url().includes('pin')) {
            console.log('[VetRadar] Still on auth page, forcing navigation to /patients...');
            const response = await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`[VetRadar] Navigation response status: ${response?.status()}`);
            await page.waitForTimeout(3000);
            console.log(`[VetRadar] Current URL after forced navigation: ${page.url()}`);
          } else {
            console.log(`[VetRadar] Successfully moved to: ${page.url()}`);
          }
        } catch (e) {
          console.log('[VetRadar] Could not enter PIN, error:', e);
          await page.screenshot({ path: 'vetradar-pin-entry-error.png', fullPage: true });

          // Try navigating directly to patients page as fallback
          try {
            console.log('[VetRadar] Trying direct navigation to /patients after PIN error...');
            await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
            console.log('[VetRadar] Fallback navigation successful');
          } catch (navError) {
            console.log('[VetRadar] Fallback navigation also failed:', navError);
          }
        }
      }

      const finalUrl = page.url();
      console.log(`[VetRadar] Final URL: ${finalUrl}`);

      // Ensure we're on the patient list page or can navigate to it
      if (!finalUrl.includes('/patients') && !finalUrl.includes('/dashboard')) {
        console.log('[VetRadar] Not on patient list page yet - attempting final navigation...');

        try {
          await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(2000);
          console.log(`[VetRadar] Navigated to patient list: ${page.url()}`);
        } catch (navError) {
          console.log('[VetRadar] Could not navigate to patient list:', navError);

          // Check if we're still on login/verify pages
          const currentUrl = page.url();
          if (currentUrl.includes('/login') || currentUrl.includes('/verify')) {
            await page.screenshot({ path: 'vetradar-login-failed.png', fullPage: true });
            throw new Error(`Login failed - stuck on: ${currentUrl}`);
          }
        }
      }

      // Final verification
      const verifyUrl = page.url();
      if (verifyUrl.includes('/login')) {
        // Check for error messages
        const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
        console.log('[VetRadar] Error messages:', errorMessages);

        // Take a screenshot for debugging
        await page.screenshot({ path: 'vetradar-login-failed.png', fullPage: true });
        throw new Error(`Login failed - still on login page. Errors: ${errorMessages.join(', ')}`);
      }

      console.log('[VetRadar] Login successful!');

      return { browser, page };
    } catch (error) {
      console.error('[VetRadar] Login error:', error);
      await page.screenshot({ path: 'vetradar-error.png' }).catch(() => {});
      await browser.close();
      throw new Error(`VetRadar login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of active patients filtered by Neurology/Neurosurgery
   */
  async getActivePatients(session: VetRadarSession): Promise<VetRadarPatient[]> {
    const { page } = session;

    try {
      console.log('[VetRadar] Getting patient list...');

      // Take screenshot of current page to see where we landed after PIN
      await page.screenshot({ path: 'vetradar-after-login.png', fullPage: true });
      console.log(`[VetRadar] Current URL after login: ${page.url()}`);

      // Ensure we're on the patient list page
      if (!page.url().includes('/patients')) {
        console.log('[VetRadar] Not on patient list page, navigating...');
        await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }

      // WAIT FOR PATIENT LIST PAGE TO FULLY LOAD
      await this.waitForPageLoad(page, 'patient list page');

      // CRITICAL: Must filter by Neurology/Neurosurgery department
      console.log('[VetRadar] Applying Neurology/Neurosurgery filter...');

      try {
        // Step 1: Click Filter button
        console.log('[VetRadar] Step 1: Looking for Filter button...');
        const filterButton = await page.getByText('Filter', { exact: true });
        await filterButton.click();
        console.log('[VetRadar] ✓ Clicked Filter button');
        await page.waitForTimeout(1000);

        // Take screenshot of filter menu
        await page.screenshot({ path: 'vetradar-filter-menu.png', fullPage: true });

        // Step 2: Click Department option
        console.log('[VetRadar] Step 2: Looking for Department option...');
        const departmentOption = await page.getByText('Department', { exact: false });
        await departmentOption.click();
        console.log('[VetRadar] ✓ Clicked Department');
        await page.waitForTimeout(1000);

        // Take screenshot of department submenu
        await page.screenshot({ path: 'vetradar-department-menu.png', fullPage: true });

        // Step 3: Click Neurology & Neurosurgery
        console.log('[VetRadar] Step 3: Looking for Neurology & Neurosurgery option...');
        const neurologySelectors = [
          'text=Neurology & Neurosurgery',
          'text=Neurology',
          'text=/neurology.*neurosurgery/i',
          'text=/neurology/i'
        ];

        let clicked = false;
        for (const selector of neurologySelectors) {
          try {
            const neuroOption = page.locator(selector).first();
            if (await neuroOption.isVisible({ timeout: 2000 })) {
              await neuroOption.click();
              console.log(`[VetRadar] ✓ Clicked Neurology/Neurosurgery (${selector})`);
              clicked = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!clicked) {
          console.log('[VetRadar] WARNING: Could not find Neurology & Neurosurgery option');
          const menuText = await page.textContent('body');
          console.log('[VetRadar] Available options:', menuText?.substring(0, 500));
        }

        // Wait for page to reload with filtered patients
        await page.waitForTimeout(3000);
        console.log('[VetRadar] ✓ Filter applied, waiting for patient list to reload...');

        // Take screenshot after filter
        await page.screenshot({ path: 'vetradar-after-neuro-filter.png', fullPage: true });

        // Close the filter panel by clicking elsewhere or pressing Escape
        await page.keyboard.press('Escape');
        console.log('[VetRadar] ✓ Closed filter panel');
        await page.waitForTimeout(1000);

      } catch (e) {
        console.log('[VetRadar] Error applying filter:', e);
        await page.screenshot({ path: 'vetradar-filter-error.png', fullPage: true });
        throw new Error(`Failed to apply Neurology filter: ${e}`);
      }

      // Wait for patient list to load
      await this.waitForPageLoad(page, 'patient list after filter');

      // Take screenshot of patient list
      await page.screenshot({ path: 'vetradar-patient-list.png', fullPage: true });

      // NEW APPROACH: Select all text and copy to get structured data
      console.log('[VetRadar] Selecting all page content...');
      await page.keyboard.press('Control+A'); // Select all
      await page.keyboard.press('Control+C'); // Copy

      // Get the copied text from clipboard
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('[VetRadar] Extracted page text, length:', pageText.length);

      // Parse patient data from the structured text
      const patients: VetRadarPatient[] = [];

      // Split by patient cards (each starts with a quoted name)
      const patientBlocks = pageText.split(/(?="[A-Z])/g).filter(block => block.includes('Canine') || block.includes('Feline'));

      console.log(`[VetRadar] Found ${patientBlocks.length} potential patient blocks`);

      for (const block of patientBlocks) {
        try {
          // Extract name (e.g., "Clara" Iovino)
          const nameMatch = block.match(/"([^"]+)"\s+([^\n]+)/);
          if (!nameMatch) continue;

          const firstName = nameMatch[1].trim();
          const lastName = nameMatch[2].split('\n')[0].trim();
          const fullName = `${firstName} ${lastName}`;

          // Extract species and breed (e.g., "Canine • Pitbull")
          const speciesMatch = block.match(/(Canine|Feline)\s*•\s*([^\n]+)/);
          const species = speciesMatch ? speciesMatch[1] : '';
          const breed = speciesMatch ? speciesMatch[2].trim() : '';

          // Extract weight, age, sex (e.g., "23kg | 5y 0m | FS")
          const demographicsMatch = block.match(/(\d+\.?\d*)\s*kg\s*\|\s*(\d+y\s+\d+m|\d+y|\d+m)\s*\|\s*(MN|M|FS|F|MC|FC)/);
          const weight = demographicsMatch ? parseFloat(demographicsMatch[1]) : 0;
          const age = demographicsMatch ? demographicsMatch[2].trim() : '';
          const sex = demographicsMatch ? demographicsMatch[3] : '';

          // Extract location (e.g., "100 - Neuro" or "100 - IP#1, T2")
          const locationMatch = block.match(/(\d+\s*-\s*[^\n]+?)(?:\s*Ph:|$)/);
          const location = locationMatch ? locationMatch[1].trim() : '';

          // Extract critical notes
          const criticalNotes: string[] = [];
          const notePatterns = [
            /TL [^\n]+/g,
            /ALERT [^\n]+/g,
            /checked in [^\n]+/g,
            /(?:MRI|SX|surgery|procedure) [^\n]+/gi
          ];

          notePatterns.forEach(pattern => {
            const matches = block.match(pattern);
            if (matches) criticalNotes.push(...matches);
          });

          // Extract treatment counts (e.g., "20 Monitoring Nursing Care +2")
          const treatments: string[] = [];
          const treatmentPattern = /(\d+)\s+(Monitoring|Nursing Care|Medications|Fluids|Procedures)(?:\s+([^\n]+))?/g;
          let treatmentMatch;
          while ((treatmentMatch = treatmentPattern.exec(block)) !== null) {
            const count = treatmentMatch[1];
            const category = treatmentMatch[2];
            const details = treatmentMatch[3] || '';
            treatments.push(`${count} ${category}${details ? ' ' + details : ''}`);
          }

          // Extract Patient ID (e.g., "Patient ID: 674131")
          const patientIdMatch = block.match(/Patient ID:\s*(\d+)/i);
          const patientId = patientIdMatch ? patientIdMatch[1] : undefined;

          // Extract Consult Number (e.g., "Consult # 5877395" or "Consult: 5877395")
          const consultMatch = block.match(/Consult\s*[#:]?\s*(\d+)/i);
          const consultNumber = consultMatch ? consultMatch[1] : undefined;

          patients.push({
            id: fullName.toLowerCase().replace(/\s+/g, '-'),
            name: fullName,
            species,
            breed,
            age,
            sex,
            weight,
            location,
            status: 'Active',
            criticalNotes,
            treatments,
            medications: [], // Will be filled later if we click into patient
            issues: [],
            patientId,        // VetRadar Patient ID for stickers
            consultNumber,    // Consult number (if visible)
          });

          console.log(`[VetRadar] Parsed patient: ${fullName} - ${treatments.length} treatments`);
        } catch (e) {
          console.log('[VetRadar] Error parsing patient block:', e);
          continue;
        }
      }

      console.log(`[VetRadar] Successfully extracted ${patients.length} patients`);

      // Deduplicate patients by name (VetRadar may show same patient multiple times)
      const uniquePatients = new Map<string, VetRadarPatient>();
      patients.forEach(patient => {
        if (!uniquePatients.has(patient.name)) {
          uniquePatients.set(patient.name, patient);
        }
      });

      const deduplicatedPatients = Array.from(uniquePatients.values());

      if (patients.length !== deduplicatedPatients.length) {
        console.log(`[VetRadar] Removed ${patients.length - deduplicatedPatients.length} duplicate patients`);
      }

      if (deduplicatedPatients.length === 0) {
        throw new Error('No patients found on page - may need to filter by department');
      }

      // Phase 1 complete - we have all the basic data from the patient list view
      // Critical notes and treatment counts are already extracted
      console.log(`[VetRadar] Phase 1 complete - ${deduplicatedPatients.length} unique patients with basic data`);

      // PHASE 2 - Vision-based medication extraction
      // Uses screenshot + Claude Vision API to extract medications from patient detail pages
      // More reliable than DOM parsing because it captures everything visible regardless of HTML structure
      const ENABLE_PHASE_2 = true; // Vision-based extraction is reliable

      if (ENABLE_PHASE_2) {
        console.log('[VetRadar] Starting Phase 2: Vision-based medication extraction...');

        for (let i = 0; i < deduplicatedPatients.length; i++) {
          const patient = deduplicatedPatients[i];
          console.log(`[VetRadar] Phase 2 [${i + 1}/${deduplicatedPatients.length}]: Extracting medications for ${patient.name}`);

          try {
            // Try multiple strategies to click the patient card
            let clicked = false;

            // Split name into parts for more flexible matching
            const nameParts = patient.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            // Strategy 1: Try clicking by quoted first name (VetRadar format: "Axel" Randhawa)
            try {
              console.log(`[VetRadar] Strategy 1: Looking for quoted name "${firstName}"`);
              const quotedNameCard = page.locator(`text=/"${firstName}"/`).first();
              await quotedNameCard.click({ timeout: 5000 });
              clicked = true;
              console.log(`[VetRadar] ✓ Clicked patient card using quoted first name`);
            } catch (e1) {
              // Strategy 2: Try clicking by full name
              try {
                console.log(`[VetRadar] Strategy 2: Looking for full name "${patient.name}"`);
                const fullNameCard = page.locator(`text="${patient.name}"`).first();
                await fullNameCard.click({ timeout: 5000 });
                clicked = true;
                console.log(`[VetRadar] ✓ Clicked patient card using full name`);
              } catch (e2) {
                // Strategy 3: Try clicking any element containing first name
                try {
                  console.log(`[VetRadar] Strategy 3: Looking for element with first name ${firstName}`);
                  const cardWithName = page.locator(`[role="button"]:has-text("${firstName}"), button:has-text("${firstName}"), a:has-text("${firstName}"), div[class*="patient"]:has-text("${firstName}")`).first();
                  await cardWithName.click({ timeout: 5000 });
                  clicked = true;
                  console.log(`[VetRadar] ✓ Clicked patient card using flexible selector`);
                } catch (e3) {
                  console.log(`[VetRadar] ✗ All click strategies failed for ${patient.name}`);
                  throw new Error(`Could not click patient card for ${patient.name}`);
                }
              }
            }

            if (!clicked) {
              throw new Error(`Failed to click patient card`);
            }

            // Wait for patient detail page to fully load
            await page.waitForTimeout(3000);

            // Scroll down to medications section (usually below monitoring vitals)
            console.log(`[VetRadar] Scrolling down to medications section...`);
            await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            await page.waitForTimeout(2000); // Wait for scroll and any dynamic content to load

            // Take screenshot of patient detail page (full page to capture medications)
            const screenshotPath = `vetradar-patient-${patient.name.replace(/\s+/g, '-')}.png`;
            await page.screenshot({
              path: screenshotPath,
              fullPage: true
            });
            console.log(`[VetRadar] Screenshot saved: ${screenshotPath}`);

            // Read screenshot as base64
            const fs = await import('fs');
            const screenshotBuffer = fs.readFileSync(screenshotPath);
            const screenshotBase64 = screenshotBuffer.toString('base64');

            // Use Claude Vision API to extract medications from screenshot
            const { parseVetRadarMedicationsFromScreenshot } = await import('@/lib/ai-parser');
            const medications = await parseVetRadarMedicationsFromScreenshot(screenshotBase64);

            console.log(`[VetRadar] Vision API extracted ${medications.length} medications for ${patient.name}`);

            // Update patient with extracted medications
            patient.medications = medications;

            // Navigate back to patient list for next patient
            console.log(`[VetRadar] Navigating back to patient list...`);
            await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Re-apply Neurology filter after navigating back
            console.log(`[VetRadar] Re-applying Neurology filter...`);
            try {
              await page.waitForTimeout(2000);
              const filterButton = await page.getByText('Filter', { exact: true });
              await filterButton.click();
              await page.waitForTimeout(1000);

              const departmentOption = await page.getByText('Department', { exact: false });
              await departmentOption.click();
              await page.waitForTimeout(1000);

              const neuroOption = page.locator('text=Neurology & Neurosurgery').first();
              await neuroOption.click();
              await page.waitForTimeout(2000);

              await page.keyboard.press('Escape');
              await page.waitForTimeout(1000);

              console.log(`[VetRadar] ✓ Re-applied Neurology filter`);
            } catch (filterError) {
              console.log(`[VetRadar] Warning: Could not re-apply filter:`, filterError);
            }

            await this.waitForPageLoad(page, 'patient list after detail view');
          } catch (error) {
            console.log(`[VetRadar] Error extracting medications for ${patient.name}:`, error);

            // Make sure we're back on patient list even if extraction failed
            try {
              console.log(`[VetRadar] Ensuring we're back on patient list after error...`);
              if (!page.url().includes('/patients')) {
                await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(2000);
              }
            } catch (navError) {
              console.log(`[VetRadar] Error navigating back to patient list:`, navError);
            }
          }
        }

        console.log(`[VetRadar] Phase 2 complete - extracted medications for ${deduplicatedPatients.filter(p => p.medications && p.medications.length > 0).length}/${deduplicatedPatients.length} patients`);
      } else {
        console.log('[VetRadar] Phase 2 (medication extraction) is disabled - using treatment counts from Phase 1');
      }

      return deduplicatedPatients;
    } catch (error) {
      await page.screenshot({ path: 'vetradar-patient-list-error.png', fullPage: true });
      throw new Error(`Failed to fetch active patients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get treatment sheet for a specific patient
   */
  async getPatientTreatmentSheet(
    patientId: string,
    session: VetRadarSession
  ): Promise<VetRadarTreatmentSheet> {
    const { page } = session;

    try {
      // Navigate to patient treatment sheet
      await page.goto(`${this.baseUrl}/patient/${patientId}/treatment`, { waitUntil: 'networkidle' });

      // Wait for treatment data to load
      await page.waitForSelector('.treatment-row, .medication-row, table', { timeout: 5000 });

      // Extract treatment data
      const treatmentData = await page.evaluate(() => {
        // Extract medications
        const medicationRows = document.querySelectorAll('.treatment-row, .medication-row, tbody tr');
        const medications = Array.from(medicationRows).map(row => {
          const medication = row.querySelector('.medication, .drug, td:nth-child(1)')?.textContent?.trim() || '';
          const dose = row.querySelector('.dose, td:nth-child(2)')?.textContent?.trim() || '';
          const route = row.querySelector('.route, td:nth-child(3)')?.textContent?.trim() || '';
          const frequency = row.querySelector('.frequency, td:nth-child(4)')?.textContent?.trim() || '';
          const time = row.querySelector('.time, td:nth-child(5)')?.textContent?.trim() || '';

          return { medication, dose, route, frequency, time };
        }).filter(med => med.medication); // Filter out empty rows

        // Extract fluids
        const fluidRows = document.querySelectorAll('.fluid-row, .fluids tr');
        const fluids = Array.from(fluidRows).map(row => {
          const type = row.querySelector('.fluid-type, td:nth-child(1)')?.textContent?.trim() || '';
          const rate = row.querySelector('.rate, td:nth-child(2)')?.textContent?.trim() || '';
          const units = row.querySelector('.units, td:nth-child(3)')?.textContent?.trim() || '';

          return { type, rate, units };
        }).filter(fluid => fluid.type);

        // Extract nursing notes/concerns
        const nursingNotes = document.querySelector('.nursing-notes, .notes, textarea[name="notes"]')?.textContent?.trim() || '';
        const concerns = document.querySelector('.concerns, .alerts')?.textContent?.trim() || '';

        // Extract patient demographics (if available on treatment sheet)
        const patientName = document.querySelector('.patient-name, h1, h2')?.textContent?.trim() || '';
        const demographics = document.body.textContent || '';

        return {
          patientName,
          medications,
          fluids,
          nursingNotes,
          concerns,
        };
      });

      return {
        patientId,
        patientName: treatmentData.patientName,
        species: '',
        age: '',
        sex: '',
        weight: 0,
        location: '',
        medications: treatmentData.medications,
        fluids: treatmentData.fluids,
        nursingNotes: treatmentData.nursingNotes,
        concerns: treatmentData.concerns,
      };
    } catch (error) {
      throw new Error(`Failed to fetch treatment sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Close VetRadar session
   */
  async closeSession(session: VetRadarSession): Promise<void> {
    await session.browser.close();
  }

  /**
   * Parse VetRadar treatment sheet into VetHub rounding format
   */
  parseTreatmentSheetToRoundingData(treatmentSheet: VetRadarTreatmentSheet): {
    signalment: string;
    location: string;
    therapeutics: string;
    fluids: string;
    concerns: string;
  } {
    const signalment = [
      treatmentSheet.species,
      treatmentSheet.age,
      treatmentSheet.sex,
      treatmentSheet.weight ? `${treatmentSheet.weight}kg` : ''
    ].filter(Boolean).join(', ');

    const therapeutics = treatmentSheet.medications
      .map(med => `${med.medication} ${med.dose} ${med.route} ${med.frequency}`.trim())
      .join('; ');

    const fluids = treatmentSheet.fluids
      .map(fluid => `${fluid.type} at ${fluid.rate} ${fluid.units}`.trim())
      .join('; ');

    const concerns = [
      treatmentSheet.concerns,
      treatmentSheet.nursingNotes
    ].filter(Boolean).join(' | ');

    return {
      signalment,
      location: treatmentSheet.location || '',
      therapeutics,
      fluids,
      concerns,
    };
  }

  /**
   * Parse VetRadar patient data into VetHub rounding format
   * Auto-fills fields where data is available, infers IVC/CRI status,
   * and sets smart defaults for fields requiring clinical judgment
   */
  parseToRoundingData(patient: VetRadarPatient): {
    signalment: string;
    location: string;
    therapeutics: string;
    fluids: string;
    ivc: string;
    cri: string;
    problems: string;
    concerns: string;
    codeStatus: string;
    icuCriteria: string;
    neurolocalization: string;
    diagnosticFindings: string;
    overnightDx: string;
    comments: string;
  } {
    // 1. SIGNALMENT - Auto-fillable from demographics
    const signalment = [
      patient.species,
      patient.age,
      patient.sex,
      patient.weight ? `${patient.weight}kg` : ''
    ].filter(Boolean).join(', ');

    // 2. LOCATION - Map VetRadar location to IP/ICU
    let location = '';
    if (patient.location) {
      // VetRadar locations like "100 - IP#1, R16" or "ICU, Cage 5"
      if (patient.location.toLowerCase().includes('icu')) {
        location = 'ICU';
      } else if (patient.location.toLowerCase().includes('ip')) {
        location = 'IP';
      } else {
        location = 'IP'; // Default to IP if unclear
      }
    }

    // 3. THERAPEUTICS - Format medications
    const medications = patient.medications || [];
    const therapeutics = medications
      .map(med => `${med.medication} ${med.dose} ${med.route} ${med.frequency}`.trim())
      .join('; ');

    // 4. FLUIDS - Check if patient has fluids running (from medications or separate fluid data)
    const fluidsText = medications
      .filter(med => {
        const medLower = med.medication.toLowerCase();
        return medLower.includes('lrs') ||
               medLower.includes('lactated ringer') ||
               medLower.includes('saline') ||
               medLower.includes('normosol') ||
               medLower.includes('plasmalyte') ||
               medLower.includes('fluid');
      })
      .map(fluid => `${fluid.medication} ${fluid.dose} ${fluid.route} ${fluid.frequency}`.trim())
      .join('; ');

    // 5. IVC STATUS - Infer from presence of fluids
    const ivc = fluidsText ? 'Y' : 'N';

    // 6. CRI STATUS - Detect CRI medications
    const hasCRI = medications.some(med => {
      const medLower = med.medication.toLowerCase();
      const freqLower = med.frequency.toLowerCase();
      return medLower.includes('cri') ||
             freqLower.includes('cri') ||
             medLower.includes('fentanyl') ||
             medLower.includes('lidocaine') ||
             medLower.includes('ketamine') ||
             (medLower.includes('infusion') && !medLower.includes('fluid'));
    });
    const cri = hasCRI ? 'Y' : 'N';

    // 7. PROBLEMS - Extract from VetRadar clinical issues
    const issues = patient.issues || [];
    const problems = issues.join('\n');

    // 8. CONCERNS - Combine any nursing notes or concerns
    const concerns = patient.cage_location || '';

    // 9. CODE STATUS - Default to Yellow (requires veterinarian review)
    // Could infer from status badge: CAUTION/CRITICAL → Orange/Red
    let codeStatus = 'Yellow';
    if (patient.status) {
      const statusLower = patient.status.toLowerCase();
      if (statusLower.includes('critical') || statusLower.includes('caution')) {
        codeStatus = 'Orange';
      } else if (statusLower.includes('friendly') || statusLower.includes('stable')) {
        codeStatus = 'Green';
      }
    }

    // 10. ICU CRITERIA - Leave blank (requires clinical decision)
    const icuCriteria = '';

    // 11. NEUROLOCALIZATION - Leave blank (requires neuro exam)
    const neurolocalization = '';

    // 12. DIAGNOSTIC FINDINGS - Leave blank (requires MRI/lab integration)
    const diagnosticFindings = '';

    // 13. OVERNIGHT DX - Leave blank (created during rounds)
    const overnightDx = '';

    // 14. COMMENTS - Note that this was imported from VetRadar
    const comments = 'Imported from VetRadar - Please review and complete missing fields';

    return {
      signalment,
      location,
      therapeutics,
      fluids: fluidsText,
      ivc,
      cri,
      problems,
      concerns,
      codeStatus,
      icuCriteria,
      neurolocalization,
      diagnosticFindings,
      overnightDx,
      comments,
    };
  }
}
