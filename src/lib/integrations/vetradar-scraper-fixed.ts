import { chromium, Page, Browser, BrowserContext } from 'playwright';

// Fixed PIN page handling section with iframe and shadow DOM support
export class VetRadarScraperFixed {
  /**
   * Enhanced button detection that handles iframes, shadow DOM, and non-standard buttons
   */
  private async findButtonInAllFrames(
    page: Page,
    buttonText: string,
    options: {
      caseSensitive?: boolean;
      exactMatch?: boolean;
      includeDisabled?: boolean;
    } = {}
  ) {
    const { caseSensitive = false, exactMatch = false, includeDisabled = false } = options;

    console.log(`[VetRadar] Searching for button "${buttonText}" in all frames...`);

    // Build selectors for various button types
    const buildSelectors = (text: string) => {
      const textPattern = exactMatch ? text : `*${text}*`;
      const caseFlag = caseSensitive ? '' : 'i';

      return [
        // Standard button elements
        `button:has-text("${text}")`,
        `button:text-matches("${text}", "${caseFlag}")`,

        // Input buttons
        `input[type="button"][value*="${text}" i]`,
        `input[type="submit"][value*="${text}" i]`,

        // Divs and spans acting as buttons
        `div:has-text("${text}")[onclick]`,
        `div:has-text("${text}")[class*="button" i]`,
        `div:has-text("${text}")[class*="btn" i]`,
        `span:has-text("${text}")[onclick]`,
        `span:has-text("${text}")[class*="button" i]`,
        `span:has-text("${text}")[class*="btn" i]`,

        // ARIA buttons
        `[role="button"]:has-text("${text}")`,
        `[aria-label*="${text}" i]`,

        // Links styled as buttons
        `a:has-text("${text}")[class*="button" i]`,
        `a:has-text("${text}")[class*="btn" i]`,

        // Generic clickable with text
        `*:has-text("${text}")[onclick]`,
        `*:has-text("${text}")[data-action]`,
        `*:has-text("${text}")[data-click]`,
      ];
    };

    const selectors = buildSelectors(buttonText);

    // Search in main page first
    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        const isEnabled = includeDisabled || !(await element.isDisabled().catch(() => false));

        if (isVisible && isEnabled) {
          console.log(`[VetRadar] Found button in main page with selector: ${selector}`);
          return { element, frame: 'main' };
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Search in all iframes
    const frames = page.frames();
    console.log(`[VetRadar] Searching in ${frames.length} frames...`);

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const frame = frames[frameIndex];

      // Skip the main frame as we already checked it
      if (frame === page.mainFrame()) continue;

      console.log(`[VetRadar] Checking frame ${frameIndex + 1}/${frames.length}: ${frame.url()}`);

      for (const selector of selectors) {
        try {
          const element = frame.locator(selector).first();
          const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
          const isEnabled = includeDisabled || !(await element.isDisabled().catch(() => false));

          if (isVisible && isEnabled) {
            console.log(`[VetRadar] Found button in frame ${frameIndex} with selector: ${selector}`);
            return { element, frame: `frame-${frameIndex}` };
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    // If still not found, try evaluating in page context (handles shadow DOM)
    try {
      console.log('[VetRadar] Searching in shadow DOM...');

      const shadowButton = await page.evaluate((searchText) => {
        const findInShadowDOM = (root: Element | ShadowRoot, text: string): Element | null => {
          // Search current level
          const elements = root.querySelectorAll('*');

          for (const el of elements) {
            // Check if element contains the text
            const elementText = el.textContent || '';
            const hasText = elementText.toLowerCase().includes(text.toLowerCase());

            // Check if it's clickable
            const isClickable =
              el.tagName === 'BUTTON' ||
              el.tagName === 'INPUT' ||
              el.getAttribute('role') === 'button' ||
              el.getAttribute('onclick') !== null ||
              (el.className && (el.className.includes('button') || el.className.includes('btn')));

            if (hasText && isClickable) {
              return el;
            }

            // Recursively check shadow roots
            if (el.shadowRoot) {
              const found = findInShadowDOM(el.shadowRoot, text);
              if (found) return found;
            }
          }

          return null;
        };

        // Start search from document
        return findInShadowDOM(document as any, searchText) !== null;
      }, buttonText);

      if (shadowButton) {
        console.log('[VetRadar] Found button in shadow DOM');
        // Return a special indicator for shadow DOM buttons
        return { element: null, frame: 'shadow-dom' };
      }
    } catch (e) {
      console.log('[VetRadar] Error searching shadow DOM:', e);
    }

    console.log(`[VetRadar] Button "${buttonText}" not found in any frame or shadow DOM`);
    return null;
  }

  /**
   * Click button with enhanced frame and shadow DOM support
   */
  private async clickButtonSafely(
    page: Page,
    buttonText: string,
    options: {
      timeout?: number;
      force?: boolean;
      retryCount?: number;
    } = {}
  ) {
    const { timeout = 10000, force = false, retryCount = 3 } = options;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      console.log(`[VetRadar] Attempt ${attempt}/${retryCount} to click "${buttonText}"`);

      const result = await this.findButtonInAllFrames(page, buttonText);

      if (!result) {
        if (attempt < retryCount) {
          console.log('[VetRadar] Button not found, waiting 2s before retry...');
          await page.waitForTimeout(2000);
          continue;
        }
        throw new Error(`Button "${buttonText}" not found after ${retryCount} attempts`);
      }

      try {
        if (result.frame === 'shadow-dom') {
          // Handle shadow DOM click via evaluate
          console.log('[VetRadar] Clicking button in shadow DOM...');
          await page.evaluate((searchText) => {
            const findAndClick = (root: Element | ShadowRoot, text: string): boolean => {
              const elements = root.querySelectorAll('*');

              for (const el of elements) {
                const elementText = el.textContent || '';
                if (elementText.toLowerCase().includes(text.toLowerCase())) {
                  const isClickable =
                    el.tagName === 'BUTTON' ||
                    el.getAttribute('role') === 'button' ||
                    el.getAttribute('onclick') !== null;

                  if (isClickable) {
                    (el as HTMLElement).click();
                    return true;
                  }
                }

                if (el.shadowRoot) {
                  if (findAndClick(el.shadowRoot, text)) return true;
                }
              }

              return false;
            };

            return findAndClick(document as any, searchText);
          }, buttonText);

          console.log(`[VetRadar] Successfully clicked "${buttonText}" in shadow DOM`);
          return true;
        } else if (result.element) {
          // Standard click for regular elements
          console.log(`[VetRadar] Clicking button in ${result.frame}...`);

          // Scroll into view first
          await result.element.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});

          // Try different click strategies
          if (force) {
            await result.element.click({ force: true, timeout });
          } else {
            await result.element.click({ timeout });
          }

          console.log(`[VetRadar] Successfully clicked "${buttonText}"`);
          return true;
        }
      } catch (clickError) {
        console.log(`[VetRadar] Click failed on attempt ${attempt}:`, clickError);

        if (attempt < retryCount) {
          // Try force click on retry
          options.force = true;
          await page.waitForTimeout(1000);
          continue;
        }

        throw clickError;
      }
    }

    return false;
  }

  /**
   * Enhanced PIN page handler
   */
  async handlePINPage(page: Page) {
    console.log('[VetRadar] === HANDLING PIN PAGE ===');

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Comprehensive page analysis
    console.log('[VetRadar] Analyzing page structure...');
    const frames = page.frames();
    console.log(`[VetRadar] Total frames: ${frames.length}`);

    // Log frame URLs for debugging
    frames.forEach((frame, index) => {
      console.log(`[VetRadar] Frame ${index}: ${frame.url()}`);
    });

    // Look for PIN inputs in all frames
    let pinInputs: any[] = [];
    let pinFrame: any = null;

    // Check main frame first
    pinInputs = await page.locator('input[type="text"]:visible, input[type="password"]:visible, input[type="number"]:visible, input[type="tel"]:visible').all();

    if (pinInputs.length >= 5) {
      console.log(`[VetRadar] Found ${pinInputs.length} PIN inputs in main frame`);
      pinFrame = page;
    } else {
      // Check all iframes
      for (const frame of frames) {
        if (frame === page.mainFrame()) continue;

        const frameInputs = await frame.locator('input[type="text"]:visible, input[type="password"]:visible, input[type="number"]:visible, input[type="tel"]:visible').all();

        if (frameInputs.length >= 5) {
          console.log(`[VetRadar] Found ${frameInputs.length} PIN inputs in iframe: ${frame.url()}`);
          pinInputs = frameInputs;
          pinFrame = frame;
          break;
        }
      }
    }

    if (pinInputs.length >= 5 && pinFrame) {
      // Enter PIN
      const pin = '32597';
      console.log('[VetRadar] Entering 5-digit PIN...');

      for (let i = 0; i < 5 && i < pinInputs.length; i++) {
        await pinInputs[i].click();
        await pinInputs[i].fill('');
        await pinInputs[i].type(pin[i], { delay: 150 });
        console.log(`[VetRadar] Entered PIN digit ${i + 1}: ${pin[i]}`);
        await page.waitForTimeout(200);
      }

      // Wait for any validation
      await page.waitForTimeout(1000);

      // Try to click Confirm PIN button
      try {
        console.log('[VetRadar] Looking for Confirm PIN button...');
        await this.clickButtonSafely(page, 'Confirm PIN', {
          timeout: 10000,
          retryCount: 3
        });
        console.log('[VetRadar] Successfully clicked Confirm PIN button');

        // Wait for navigation
        await page.waitForTimeout(3000);
        return true;
      } catch (confirmError) {
        console.log('[VetRadar] Could not find/click Confirm PIN button:', confirmError);

        // Try alternative confirm buttons
        const alternativeButtons = ['Confirm', 'Submit', 'Continue', 'Done', 'OK'];

        for (const btnText of alternativeButtons) {
          try {
            await this.clickButtonSafely(page, btnText, {
              timeout: 3000,
              retryCount: 1
            });
            console.log(`[VetRadar] Clicked alternative button: ${btnText}`);
            await page.waitForTimeout(3000);
            return true;
          } catch (e) {
            // Continue to next alternative
          }
        }

        console.log('[VetRadar] No confirm button found, checking for auto-submit...');

        // Check if PIN auto-submitted
        try {
          await page.waitForURL(url => !url.toString().includes('pin') && !url.toString().includes('set_up'), {
            timeout: 5000
          });
          console.log('[VetRadar] PIN auto-submitted successfully');
          return true;
        } catch (e) {
          console.log('[VetRadar] PIN did not auto-submit');
        }
      }
    } else {
      console.log(`[VetRadar] Only found ${pinInputs.length} input fields, expected at least 5`);
    }

    // If we can't enter PIN, try to skip
    console.log('[VetRadar] Attempting to skip PIN setup...');
    try {
      await this.clickButtonSafely(page, 'Skip', {
        timeout: 5000,
        retryCount: 2
      });
      console.log('[VetRadar] Successfully clicked Skip button');
      await page.waitForTimeout(3000);
      return true;
    } catch (skipError) {
      console.log('[VetRadar] Could not find/click Skip button:', skipError);

      // Try alternative skip text
      const skipVariants = ['Skip for 24 Hours', 'Skip for 24', 'Later', 'Not now', 'Cancel'];

      for (const skipText of skipVariants) {
        try {
          await this.clickButtonSafely(page, skipText, {
            timeout: 3000,
            retryCount: 1
          });
          console.log(`[VetRadar] Clicked skip variant: ${skipText}`);
          await page.waitForTimeout(3000);
          return true;
        } catch (e) {
          // Continue to next variant
        }
      }
    }

    // Final fallback - try to click ANY visible button
    console.log('[VetRadar] Final fallback - trying to click any visible button...');
    try {
      const anyButton = await this.findButtonInAllFrames(page, '', {
        exactMatch: false,
        includeDisabled: false
      });

      if (anyButton && anyButton.element) {
        const btnText = await anyButton.element.textContent();
        console.log(`[VetRadar] Clicking first available button: "${btnText}"`);
        await anyButton.element.click();
        await page.waitForTimeout(3000);
        return true;
      }
    } catch (e) {
      console.log('[VetRadar] Could not click any button:', e);
    }

    console.log('[VetRadar] === FAILED TO HANDLE PIN PAGE ===');

    // Take a final screenshot for debugging
    await page.screenshot({
      path: 'vetradar-pin-page-final-debug.png',
      fullPage: true
    });
    console.log('[VetRadar] Final debug screenshot saved');

    return false;
  }
}

// Export the fixed PIN handler for integration
export async function handleVetRadarPINPage(page: Page): Promise<boolean> {
  const scraper = new VetRadarScraperFixed();
  return await scraper.handlePINPage(page);
}