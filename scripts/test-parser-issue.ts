/**
 * Test what happens when clinical notes text is pasted into Add Patient
 */

import { parsePatientBlurb } from '../src/lib/ai-parser';

const problematicText = `Bruno Scerbo 674765
elected to pursue MRI and
then proceed with
hemilaminectomy.`;

console.log('🔍 Testing AI parser with clinical notes text...\n');
console.log('Input text:');
console.log('-------------------');
console.log(problematicText);
console.log('-------------------\n');

parsePatientBlurb(problematicText)
  .then(result => {
    console.log('✅ Parser Result:');
    console.log(JSON.stringify(result, null, 2));

    if (!result.patientName || result.patientName === '') {
      console.log('\n❌ ERROR: Parser returned empty patient name!');
      console.log('This is why you get "Unnamed Patient"');
    }

    if (result.plan?.includes('MRI') || result.problem?.includes('MRI')) {
      console.log('\n✅ Clinical text correctly identified as plan/problem, not demographics');
    }
  })
  .catch(error => {
    console.error('❌ Parser error:', error);
  });
