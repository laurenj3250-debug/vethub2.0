/**
 * Systematic verification of sticker fixes on Railway production
 * This script will:
 * 1. Navigate to Railway app
 * 2. Click "Print Big Labels" button
 * 3. Capture the generated sticker HTML
 * 4. Verify format is correct (6 lines, no duplicates, no random text)
 */

import { chromium } from 'playwright';

const RAILWAY_URL = 'https://empathetic-clarity-production.up.railway.app/';

async function verifyStickersOnRailway() {
  console.log('🚀 Starting systematic sticker verification on Railway...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to Railway app
    console.log('📍 Step 1: Navigating to Railway app...');
    await page.goto(RAILWAY_URL, { waitUntil: 'networkidle' });
    console.log('✅ Loaded:', RAILWAY_URL);

    // Step 2: Wait for patients to load
    console.log('\n📍 Step 2: Waiting for patients to load...');
    await page.waitForSelector('[data-testid="patient-list-item"], .patient-card, .patient-item', {
      timeout: 10000,
      state: 'visible',
    }).catch(() => {
      console.log('⚠️  No patients found - this is expected if database is empty');
    });

    // Step 3: Look for Print menu or sticker controls
    console.log('\n📍 Step 3: Looking for Print/Sticker controls...');

    // Try to find the print menu button
    const printMenuButton = await page.locator('button:has-text("Print"), button:has-text("Export")').first();
    const printButtonExists = await printMenuButton.count() > 0;

    if (printButtonExists) {
      console.log('✅ Found Print menu button');
      await printMenuButton.click();
      await page.waitForTimeout(500);

      // Look for "Print Big Labels" option
      const bigLabelsButton = await page.locator('button:has-text("Big Label"), button:has-text("Patient Label")').first();
      const bigLabelsExists = await bigLabelsButton.count() > 0;

      if (bigLabelsExists) {
        console.log('✅ Found Big Labels button');

        // Click to generate stickers (this will open a new window)
        console.log('\n📍 Step 4: Generating stickers...');
        const [popup] = await Promise.all([
          context.waitForEvent('page'),
          bigLabelsButton.click(),
        ]);

        await popup.waitForLoadState('load');
        console.log('✅ Sticker window opened');

        // Step 5: Verify sticker format
        console.log('\n📍 Step 5: Verifying sticker format...');

        const stickerPages = await popup.locator('.page, .label').all();
        console.log(`Found ${stickerPages.length} sticker labels`);

        if (stickerPages.length > 0) {
          // Check first sticker for format
          const firstSticker = stickerPages[0];
          const stickerText = await firstSticker.textContent();

          console.log('\n📋 First Sticker Content:');
          console.log('----------------------------');
          console.log(stickerText);
          console.log('----------------------------');

          // Verify format
          const lines = stickerText?.trim().split('\n').filter(l => l.trim()) || [];
          console.log(`\n✅ Number of lines: ${lines.length}`);

          // Check for expected fields
          const checks = {
            'Patient Name + IDs (Line 1)': /\w+\s+\d+\s+\d+/.test(lines[0] || ''),
            'Owner Name + Phone (Line 2)': /\w+.*\d{10}/.test(lines[1] || ''),
            'Species (Line 3)': /Species:.*\(.*\)/.test(lines[2] || ''),
            'Breed (Line 4)': /Breed:/.test(lines[3] || ''),
            'Sex & Weight (Line 5)': /Sex:.*Weight:/.test(lines[4] || ''),
            'DOB & Age (Line 6)': /DOB:.*Age:/.test(lines[5] || ''),
          };

          console.log('\n🔍 Format Validation:');
          Object.entries(checks).forEach(([check, passed]) => {
            console.log(`  ${passed ? '✅' : '❌'} ${check}`);
          });

          // Check for duplicates
          const stickerTexts = await Promise.all(
            stickerPages.map(s => s.textContent())
          );
          const uniqueStickers = new Set(stickerTexts);

          if (stickerTexts.length > uniqueStickers.size) {
            console.log(`\n⚠️  WARNING: Found duplicate stickers (${stickerTexts.length} total, ${uniqueStickers.size} unique)`);
          } else {
            console.log(`\n✅ No duplicates detected (${stickerTexts.length} unique stickers)`);
          }

          // Check for random text contamination
          const hasContamination = stickerText?.includes('elected to pursue') ||
                                   stickerText?.includes('MRI and');
          if (hasContamination) {
            console.log('\n❌ ERROR: Random text contamination detected!');
          } else {
            console.log('\n✅ No random text contamination');
          }

        } else {
          console.log('⚠️  No sticker labels found in popup');
        }

        await popup.close();
      } else {
        console.log('⚠️  Big Labels button not found');
      }
    } else {
      console.log('⚠️  Print menu button not found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Systematic verification complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser left open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');

    // Wait indefinitely
    await new Promise(() => {});
  }
}

verifyStickersOnRailway().catch(console.error);
