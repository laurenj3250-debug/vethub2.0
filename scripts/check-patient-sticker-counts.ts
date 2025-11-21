#!/usr/bin/env tsx

/**
 * Check tinySheetCount values for all patients on Railway
 * Usage: npx tsx scripts/check-patient-sticker-counts.ts
 */

async function checkPatientStickerCounts() {
  const RAILWAY_URL = 'https://empathetic-clarity-production.up.railway.app';

  console.log('🔍 Fetching all patients from Railway...\n');

  try {
    const response = await fetch(`${RAILWAY_URL}/api/patients`);
    const patients = await response.json();

    console.log(`📊 Found ${patients.length} patients\n`);
    console.log('='.repeat(80));

    for (const patient of patients) {
      const name = patient.demographics?.name || 'Unknown';
      const tinyCount = patient.stickerData?.tinySheetCount;
      const bigCount = patient.stickerData?.bigLabelCount;

      console.log(`\n👤 ${name} (ID: ${patient.id})`);
      console.log(`   stickerData:`, patient.stickerData);
      console.log(`   bigLabelCount: ${bigCount}`);
      console.log(`   tinySheetCount: ${tinyCount}`);

      if (tinyCount === undefined || tinyCount === null || tinyCount === 1) {
        console.log(`   ⚠️  WARNING: tinySheetCount is ${tinyCount} (should be 4 or 8 for MRI/Surgery)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Check complete!');

    // Summary
    const needsUpdate = patients.filter(p => {
      const count = p.stickerData?.tinySheetCount;
      return count === undefined || count === null || count === 1;
    });

    if (needsUpdate.length > 0) {
      console.log(`\n⚠️  ${needsUpdate.length} patients need tinySheetCount updated`);
      console.log('   Patients:', needsUpdate.map(p => p.demographics?.name).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPatientStickerCounts();
