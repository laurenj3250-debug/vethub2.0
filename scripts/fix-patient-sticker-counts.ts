#!/usr/bin/env tsx

/**
 * Fix tinySheetCount for existing patients on Railway
 * Logic: bigLabelCount 5 = MRI → tinySheetCount 4
 *        bigLabelCount 4 = Surgery → tinySheetCount 8
 *        bigLabelCount 2 = Medical → tinySheetCount 0
 */

async function fixPatientStickerCounts() {
  const RAILWAY_URL = 'https://empathetic-clarity-production.up.railway.app';

  console.log('🔍 Fetching all patients from Railway...\n');

  try {
    const response = await fetch(`${RAILWAY_URL}/api/patients`);
    const patients = await response.json();

    console.log(`📊 Found ${patients.length} patients\n`);
    console.log('='.repeat(80));

    for (const patient of patients) {
      const name = patient.demographics?.name || 'Unknown';
      const currentBigCount = patient.stickerData?.bigLabelCount;
      const currentTinyCount = patient.stickerData?.tinySheetCount;

      // Determine correct tinySheetCount based on bigLabelCount
      let correctTinyCount: number;
      if (currentBigCount === 5) {
        correctTinyCount = 4; // MRI
      } else if (currentBigCount === 4) {
        correctTinyCount = 8; // Surgery
      } else {
        correctTinyCount = 0; // Medical
      }

      console.log(`\n👤 ${name} (ID: ${patient.id})`);
      console.log(`   bigLabelCount: ${currentBigCount}`);
      console.log(`   tinySheetCount: ${currentTinyCount} → ${correctTinyCount}`);

      if (currentTinyCount !== correctTinyCount) {
        console.log(`   🔧 Updating...`);

        const updateResponse = await fetch(`${RAILWAY_URL}/api/patients/${patient.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stickerData: {
              ...patient.stickerData,
              tinySheetCount: correctTinyCount,
            }
          })
        });

        if (updateResponse.ok) {
          console.log(`   ✅ Updated!`);
        } else {
          console.log(`   ❌ Failed: ${updateResponse.statusText}`);
        }
      } else {
        console.log(`   ✅ Already correct`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPatientStickerCounts();
