/**
 * VetRadar PIN Page Handler - Fixed Implementation
 *
 * This patch replaces the PIN handling section in vetradar-scraper.ts (lines 280-530)
 *
 * Key fixes:
 * 1. Searches for buttons in ALL frames (main page + 8 detected iframes)
 * 2. Handles shadow DOM elements
 * 3. Detects non-standard button elements (divs, spans with onclick)
 * 4. Uses multiple fallback strategies
 */

// Replace the existing PIN handling section (approximately lines 280-530) with this:

// After detecting PIN inputs and entering the digits...
// (Keep existing code up to line ~302 where PIN digits are entered)

// CRITICAL: Wait for page to fully load before looking for buttons
await this.waitForPageLoad(page, 'PIN page after digit entry');

// Enhanced button search function
const findButtonInFrames = async (buttonTexts: string[]): Promise<any> => {
  // Get all frames on the page
  const frames = page.frames();
  console.log(`[VetRadar] Searching for buttons in ${frames.length} frames...`);

  for (const searchText of buttonTexts) {
    // Search in main frame first
    const mainSelectors = [
      `button:has-text("${searchText}")`,
      `input[type="button"][value*="${searchText}" i]`,
      `input[type="submit"][value*="${searchText}" i]`,
      `div:has-text("${searchText}")[onclick]`,
      `div:has-text("${searchText}")[class*="button" i]`,
      `div:has-text("${searchText}")[class*="btn" i]`,
      `span:has-text("${searchText}")[onclick]`,
      `span:has-text("${searchText}")[class*="button" i]`,
      `span:has-text("${searchText}")[class*="btn" i]`,
      `[role="button"]:has-text("${searchText}")`,
      `[aria-label*="${searchText}" i]`,
      `a:has-text("${searchText}")[class*="button" i]`,
      `a:has-text("${searchText}")[class*="btn" i]`,
      `*:has-text("${searchText}")[onclick]`,
      `*:has-text("${searchText}")[data-action]`,
    ];

    for (const selector of mainSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`[VetRadar] Found button "${searchText}" in main frame with selector: ${selector}`);
          return element;
        }
      } catch (e) {
        // Continue
      }
    }

    // Search in each iframe
    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const frame = frames[frameIndex];
      if (frame === page.mainFrame()) continue;

      console.log(`[VetRadar] Checking frame ${frameIndex + 1}/${frames.length} for "${searchText}"`);

      for (const selector of mainSelectors) {
        try {
          const element = frame.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`[VetRadar] Found button "${searchText}" in frame ${frameIndex} with selector: ${selector}`);
            return element;
          }
        } catch (e) {
          // Continue
        }
      }
    }
  }

  return null;
};

// Try to find and click Confirm PIN button
let confirmed = false;
try {
  console.log('[VetRadar] Looking for Confirm PIN button...');

  const confirmButton = await findButtonInFrames([
    'Confirm PIN',
    'Confirm',
    'Submit',
    'Continue',
    'Next',
    'Done',
    'OK'
  ]);

  if (confirmButton) {
    // Scroll into view and click
    await confirmButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await confirmButton.click({ timeout: 5000 });
    console.log('[VetRadar] Successfully clicked Confirm button');
    await page.waitForTimeout(3000);
    confirmed = true;
  } else {
    console.log('[VetRadar] Confirm button not found in any frame');
  }
} catch (e) {
  console.log('[VetRadar] Error clicking Confirm button:', e);
}

// If no confirm button found, check for auto-navigation
if (!confirmed) {
  console.log('[VetRadar] No confirm button found - checking for auto-submit...');
  try {
    await page.waitForURL(url => !url.includes('verify_email') && !url.includes('set_up_pin'), { timeout: 5000 });
    console.log(`[VetRadar] PIN auto-submitted, navigated to: ${page.url()}`);
    confirmed = true;
  } catch (e) {
    console.log('[VetRadar] No auto-navigation detected after PIN entry');
  }
}

// Check if we're still on PIN setup page
await page.waitForTimeout(2000);
const currentUrl = page.url();
console.log(`[VetRadar] Current URL after PIN handling: ${currentUrl}`);

// If still on PIN page, try to skip
if (currentUrl.includes('/set_up_pin') || currentUrl.includes('/pin')) {
  console.log('[VetRadar] Still on PIN page - looking for skip button...');

  let skipped = false;
  try {
    const skipButton = await findButtonInFrames([
      'Skip',
      'Skip for 24 Hours',
      'Skip for 24',
      'Later',
      'Not now',
      'Cancel'
    ]);

    if (skipButton) {
      await skipButton.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await skipButton.click({ timeout: 5000 });
      console.log('[VetRadar] Successfully clicked Skip button');
      await page.waitForTimeout(3000);
      skipped = true;
    } else {
      console.log('[VetRadar] Skip button not found in any frame');
    }
  } catch (e) {
    console.log('[VetRadar] Error clicking Skip button:', e);
  }

  // If still stuck, try clicking ANY visible button as last resort
  if (!skipped && !confirmed) {
    console.log('[VetRadar] Final fallback - trying any visible button in any frame...');

    const frames = page.frames();
    for (const frame of frames) {
      try {
        // Generic button selector
        const anyButton = frame.locator('button:visible, [role="button"]:visible, div[onclick]:visible, span[onclick]:visible').first();

        if (await anyButton.isVisible({ timeout: 1000 })) {
          const btnText = await anyButton.textContent().catch(() => 'unknown');
          console.log(`[VetRadar] Clicking first available button in frame: "${btnText?.trim()}"`);
          await anyButton.click({ timeout: 3000 });
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }
}

// Final debug information
console.log('[VetRadar] === PIN PAGE HANDLING COMPLETE ===');
console.log(`[VetRadar] Final URL: ${page.url()}`);

// Take final screenshot for debugging
await page.screenshot({
  path: 'vetradar-pin-page-final.png',
  fullPage: true
});
console.log('[VetRadar] Final screenshot saved: vetradar-pin-page-final.png');

// Continue with the rest of the login flow...