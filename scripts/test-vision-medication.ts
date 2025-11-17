import 'dotenv/config';
import { parseVetRadarMedicationsFromScreenshot } from '../src/lib/ai-parser';
import * as fs from 'fs';

async function testVisionAPI() {
  console.log('🧪 Testing Vision API Medication Extraction\n');

  const screenshotPath = 'vetradar-patient-Charlie-Torres.png';
  console.log(`📸 Reading screenshot: ${screenshotPath}`);

  const screenshotBuffer = fs.readFileSync(screenshotPath);
  const screenshotBase64 = screenshotBuffer.toString('base64');

  console.log(`✅ Screenshot loaded (${(screenshotBase64.length / 1024).toFixed(2)} KB base64)\n`);

  console.log('🔍 Calling Claude Vision API...\n');

  const medications = await parseVetRadarMedicationsFromScreenshot(screenshotBase64);

  console.log(`\n✅ Extraction complete! Found ${medications.length} medications:\n`);

  if (medications.length === 0) {
    console.log('⚠️  No medications found in screenshot');
  } else {
    medications.forEach((med, index) => {
      console.log(`${index + 1}. ${med.medication}`);
      console.log(`   Dose: ${med.dose}`);
      console.log(`   Route: ${med.route}`);
      console.log(`   Frequency: ${med.frequency}`);
      if (med.time) console.log(`   Time: ${med.time}`);
      console.log('');
    });
  }
}

testVisionAPI().catch(console.error);
