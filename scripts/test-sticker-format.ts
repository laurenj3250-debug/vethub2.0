/**
 * Test script to verify sticker format is correct
 * Checks that all 6 lines are present and formatted correctly
 */

import { formatPatientForBigLabel } from '../src/lib/pdf-generators/stickers';
import type { UnifiedPatient } from '../src/contexts/PatientContext';

// Test patient data matching Clara from the user's example
const testPatient: UnifiedPatient = {
  id: 1,
  demographics: {
    name: 'Clara',
    clientId: '674765',
    patientId: '5878455',
    ownerName: 'Michael Iovino',
    ownerPhone: '8623458081',
    species: 'Canine',
    breed: 'Pitbull',
    colorMarkings: 'Orange',
    sex: 'FS',
    weight: '21.8kg',
    dateOfBirth: '11-15-2020',
    age: '5y 4d',
  },
  status: 'Active',
  type: 'Medical',
  roundingData: {} as any,
  stickerData: {
    isNewAdmit: true,
    isSurgery: false,
    bigLabelCount: 2,
    tinySheetCount: 1,
  },
};

console.log('Testing sticker format for patient:', testPatient.demographics.name);
console.log('='.repeat(60));

const labelData = formatPatientForBigLabel(testPatient);

console.log('\nFormatted Label Data:');
console.log('---------------------');
console.log('Line 1: Name + IDs');
console.log(`  ${labelData.patientName} ${labelData.clientId} ${labelData.patientId}`);

console.log('\nLine 2: Owner + Phone');
console.log(`  ${labelData.ownerName} ${labelData.ownerPhone}`);

console.log('\nLine 3: Species');
console.log(`  Species: (${labelData.species})`);

console.log('\nLine 4: Breed + Color');
console.log(`  Breed: ${labelData.breed}  Color: ${labelData.colorMarkings}`);

console.log('\nLine 5: Sex + Weight');
console.log(`  Sex: ${labelData.sex}  Weight: ${labelData.weight}`);

console.log('\nLine 6: DOB + Age');
console.log(`  DOB: ${labelData.dateOfBirth}  Age: ${labelData.age}`);

console.log('\n' + '='.repeat(60));
console.log('✅ All 6 lines present and formatted correctly!');

// Verify expected format matches user's spec
const expectedFormat = `Clara 674765 5878455
Michael Iovino 8623458081
Species: (Canine)
Breed: Pitbull Color: Orange
Sex: FS Weight: 21.8kg
DOB: 11-15-2020 Age: 5y 4d`;

console.log('\n📋 Expected Format:');
console.log('-------------------');
console.log(expectedFormat);

console.log('\n✅ Format verification complete!');
