/**
 * Test parser with actual Donut patient data from EzyVet
 */

import { parsePatientBlurb } from '../src/lib/ai-parser';

const donutData = `Patient
Donut (MN)
Patient ID: 674724
Date of Birth: 08-08-2022
3 years 3 months 11 days - 6.70kg
Canine - mixed
Owner
Rivera, Stacey
Kaylee Ph: 201-820-5015
Stacey Ph: 551-404-5642
Consult # 5878302
Presenting Problem
Neck pain
Medications:
Gabapentin 100mg PO q12h
Carprofen 25mg SID AM
Methocarbamol 500mg - 1/4 tab PO q8h`;

console.log('🔍 Testing parser with Donut patient (EzyVet export)...\n');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set!');
  console.log('Run with: ANTHROPIC_API_KEY=your-key npx tsx scripts/test-donut-patient.ts');
  process.exit(1);
}

parsePatientBlurb(donutData)
  .then(result => {
    console.log('✅ Parser Result:');
    console.log(JSON.stringify(result, null, 2));

    // Verify critical fields
    console.log('\n📋 Verification:');
    console.log(`  Patient Name: ${result.patientName || '❌ MISSING'}`);
    console.log(`  Owner Name: ${result.ownerName || '❌ MISSING'}`);
    console.log(`  Owner Phone: ${result.ownerPhone || '❌ MISSING'}`);
    console.log(`  Species: ${result.species || '❌ MISSING'}`);
    console.log(`  Breed: ${result.breed || '❌ MISSING'}`);
    console.log(`  Age: ${result.age || '❌ MISSING'}`);
    console.log(`  Sex: ${result.sex || '❌ MISSING'}`);
    console.log(`  Weight: ${result.weight || '❌ MISSING'}`);
    console.log(`  DOB: ${result.dateOfBirth || '❌ MISSING'}`);
    console.log(`  Patient ID: ${result.patientId || '❌ MISSING'}`);
    console.log(`  Consult #: ${result.clientId || '❌ MISSING'}`);

    if (!result.patientName) {
      console.log('\n❌ ERROR: No patient name extracted!');
      console.log('This would create an "Unnamed Patient"');
    } else {
      console.log(`\n✅ SUCCESS: Would create patient "${result.patientName}"`);
    }
  })
  .catch(error => {
    console.error('❌ Parser error:', error);
  });
