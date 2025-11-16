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

        try {
          // First, log all clickable elements to see what's available
          const allButtons = await page.locator('button, a, [role="button"]').all();
          console.log('[VetRadar] Found clickable elements on verification page:');
          for (const btn of allButtons) {
            const text = await btn.textContent().catch(() => '');
            if (text) {
              console.log(`  - "${text.trim()}"`);
            }
          }

          // Look for skip/continue buttons with very broad selectors
          const skipSelectors = [
            'button:has-text("Skip")',
            'button:has-text("skip")',
            'a:has-text("Skip")',
            'a:has-text("skip")',
            'button:has-text("Later")',
            'a:has-text("Later")',
            'button:has-text("Remind")',
            'a:has-text("Remind")',
            'button:has-text("Continue")',
            'a:has-text("Continue")',
            'button:has-text("Not now")',
            'a:has-text("Not now")',
            'button:has-text("Maybe later")',
            'a:has-text("Maybe later")',
            'button:has-text("Close")',
            'a:has-text("Close")',
            '[data-testid*="skip"]',
            '[class*="skip"]',
            '[class*="close"]',
          ];

          let skipped = false;
          for (const selector of skipSelectors) {
            try {
              const skipButton = page.locator(selector).first();
              if (await skipButton.isVisible({ timeout: 1000 })) {
                await skipButton.click({ timeout: 5000 });
                console.log(`[VetRadar] Clicked skip button using: ${selector}`);
                await page.waitForTimeout(3000);

                // Verify we actually left the page
                if (!page.url().includes('verify_email')) {
                  skipped = true;
                  break;
                }
              }
            } catch (e) {
              continue;
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

      // Handle PIN setup/verification page
      if (page.url().includes('/set_up_pin') || page.url().includes('/verify') || page.url().includes('/pin')) {
        console.log('[VetRadar] On PIN page - entering PIN 32597...');

        try {
          // Wait a moment for page to be interactive
          await page.waitForTimeout(2000);

          // Get only visible input fields
          const pinInputs = await page.locator('input:visible').all();
          console.log(`[VetRadar] Found ${pinInputs.length} visible input fields`);

          // Enter PIN: 32597
          const pin = '32597';

          if (pinInputs.length === 5) {
            // Enter each digit into separate boxes
            for (let i = 0; i < 5; i++) {
              await pinInputs[i].click();
              await pinInputs[i].type(pin[i], { delay: 100 });
              console.log(`[VetRadar] Entered digit ${i + 1}: ${pin[i]}`);
            }
          } else if (pinInputs.length > 0) {
            // Try entering the full PIN in the first visible input
            console.log('[VetRadar] Entering full PIN in first input...');
            await pinInputs[0].click();
            await pinInputs[0].type(pin, { delay: 100 });
          }

          // Wait a moment and then look for confirm button with flexible selectors
          await page.waitForTimeout(1000);

          const confirmSelectors = [
            'button:has-text("Confirm")',
            'button:has-text("confirm")',
            'button:has-text("Submit")',
            'button:has-text("Continue")',
            'button[type="submit"]',
          ];

          let confirmed = false;
          for (const selector of confirmSelectors) {
            try {
              const confirmBtn = page.locator(selector).first();
              if (await confirmBtn.isVisible({ timeout: 2000 })) {
                await confirmBtn.click({ timeout: 5000 });
                console.log(`[VetRadar] Clicked confirm button using: ${selector}`);
                await page.waitForTimeout(3000);
                confirmed = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }

          if (confirmed) {
            console.log('[VetRadar] Successfully confirmed PIN');
          } else {
            console.log('[VetRadar] No confirm button found - PIN may have been auto-submitted');
          }

          // Navigate to patients page after PIN entry
          if (!page.url().includes('/patients')) {
            console.log('[VetRadar] Navigating to patient list page after PIN...');
            await page.goto(`${this.baseUrl}/patients`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(2000);
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

      // Wait for page to be interactive
      await page.waitForTimeout(3000);

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
      console.log('[VetRadar] Waiting for patient list...');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

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

          patients.push({
            id: firstName.toLowerCase().replace(/\s+/g, '-'),
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
            issues: []
          });

          console.log(`[VetRadar] Parsed patient: ${fullName} - ${treatments.length} treatments`);
        } catch (e) {
          console.log('[VetRadar] Error parsing patient block:', e);
          continue;
        }
      }

      console.log(`[VetRadar] Successfully extracted ${patients.length} patients`);

      if (patients.length === 0) {
        throw new Error('No patients found on page - may need to filter by department');
      }

      // Phase 1 complete - we have all the basic data from the patient list view
      // Critical notes and treatment counts are already extracted
      console.log(`[VetRadar] Phase 1 complete - ${patients.length} patients with basic data`);

      // TODO: PHASE 2 - Detailed medication extraction (currently disabled)
      // Phase 2 would click into each patient to get detailed medication info
      // from the "..." menu → "Medications" sidebar.
      // Disabled for now due to unreliable clicking - Phase 1 provides good value already.
      // User can manually review medications when doing final rounding review.

      console.log(`[VetRadar] Completed extraction for ${patients.length} patients`);

      return patients;
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
