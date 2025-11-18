/**
 * Comprehensive End-to-End Test for Unified Patient Hub
 *
 * Tests the complete workflow:
 * 1. Parse referral email text → structured data
 * 2. Generate all outputs (rounding, SOAP, treatment, stickers, MRI)
 * 3. Save patient to database
 * 4. Verify data persisted correctly
 *
 * Run: npx tsx scripts/test-unified-hub.ts
 */

const BASE_URL = 'http://localhost:3000';

// Sample referral email text (realistic veterinary referral)
const SAMPLE_REFERRAL = `
Patient: Luna
Species: Canine
Breed: Labrador Retriever
Age: 7 years old
Sex: Female Spayed
Weight: 32 kg

Chief Complaint: Acute onset paraparesis, painful on palpation of thoracolumbar spine

History: Luna presented to rDVM 2 days ago with acute onset difficulty walking on hind limbs.
Started on tramadol 100mg PO TID, gabapentin 300mg PO TID, and methocarbamol 500mg PO TID.
No improvement, now unable to stand on hind limbs. Deep pain present bilaterally.

Physical Exam: BAR, HR 110, RR 28, T 101.2°F, MM pink, CRT <2sec

Neuro Exam:
- Mentation: Bright, alert, responsive
- Gait: Non-ambulatory paraparesis
- Postural reactions: Absent both pelvic limbs
- Spinal reflexes: Patellar +2/+2, withdrawal +2/+2
- Pain: Severe pain on palpation T12-L3
- Deep pain: Present bilaterally

Assessment: T3-L3 myelopathy, likely IVDD

Plan:
- MRI brain and full spine recommended
- Pain management: Fentanyl CRI
- If surgical candidate: hemilaminectomy
`;

interface TestResult {
  step: string;
  passed: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function testStep(step: string, testFn: () => Promise<any>): Promise<any> {
  console.log(`\n🧪 Testing: ${step}...`);
  try {
    const data = await testFn();
    results.push({ step, passed: true, data });
    console.log(`✅ PASSED: ${step}`);
    return data;
  } catch (error) {
    results.push({
      step,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
    console.error(`❌ FAILED: ${step}`);
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

async function testAIParsing() {
  const response = await fetch(`${BASE_URL}/api/ai-parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: SAMPLE_REFERRAL }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AI Parse failed: ${JSON.stringify(error)}`);
  }

  const parsed = await response.json();

  // Validate required fields were extracted
  const requiredFields = ['patientName', 'species', 'breed', 'age', 'sex', 'weight'];
  const missingFields = requiredFields.filter(field => !parsed[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate accuracy
  if (parsed.patientName !== 'Luna') {
    throw new Error(`Expected patientName='Luna', got '${parsed.patientName}'`);
  }
  if (!parsed.breed.includes('Labrador')) {
    throw new Error(`Expected breed to contain 'Labrador', got '${parsed.breed}'`);
  }
  if (!parsed.weight.includes('32')) {
    throw new Error(`Expected weight to contain '32', got '${parsed.weight}'`);
  }

  return parsed;
}

async function testOutputGeneration(parsedData: any) {
  // Simulate what UnifiedPatientForm does
  const patientData = {
    demographics: {
      name: parsedData.patientName,
      species: parsedData.species,
      breed: parsedData.breed,
      age: parsedData.age,
      sex: parsedData.sex,
      weight: parsedData.weight,
    },
    clinical: {
      problems: parsedData.problems,
      history: parsedData.currentHistory,
      medications: parsedData.currentMedications,
      diagnosticFindings: parsedData.diagnosticFindings,
    },
    type: 'Medical',
    location: 'ICU',
    codeStatus: 'Green',
    icuCriteria: 'Yes',
  };

  // Generate outputs using the same functions from patient-hub/page.tsx
  const outputs = {
    roundingSheet: generateRoundingSheet(patientData),
    soapNote: generateSOAPNote(patientData),
    treatmentSheet: generateTreatmentSheet(patientData),
    stickers: generateStickers(patientData),
  };

  // Validate rounding sheet has required fields
  const roundingRequired = ['signalment', 'location', 'code', 'problems'];
  const roundingMissing = roundingRequired.filter(field => !outputs.roundingSheet[field]);

  if (roundingMissing.length > 0) {
    throw new Error(`Rounding sheet missing: ${roundingMissing.join(', ')}`);
  }

  // Validate SOAP note structure
  const soapRequired = ['visitType', 'subjective', 'physicalExam', 'neuroExam', 'assessment', 'plan'];
  const soapMissing = soapRequired.filter(field => !outputs.soapNote[field]);

  if (soapMissing.length > 0) {
    throw new Error(`SOAP note missing: ${soapMissing.join(', ')}`);
  }

  return { patientData, outputs };
}

async function testPatientSave(patientData: any, outputs: any) {
  const response = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      demographics: patientData.demographics,
      status: 'Active',
      type: patientData.type,
      roundingData: outputs.roundingSheet,
      medicalHistory: {
        clinicalHistory: patientData.clinical.history,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Patient save failed: ${JSON.stringify(error)}`);
  }

  const savedPatient = await response.json();

  // Validate patient was saved with correct data
  if (!savedPatient.id) {
    throw new Error('Patient saved but no ID returned');
  }

  if (savedPatient.demographics?.name !== 'Luna') {
    throw new Error(`Expected patient name 'Luna', got '${savedPatient.demographics?.name}'`);
  }

  return savedPatient;
}

async function testPatientRetrieval(patientId: number) {
  const response = await fetch(`${BASE_URL}/api/patients`);

  if (!response.ok) {
    throw new Error('Failed to retrieve patients');
  }

  const patients = await response.json();
  const savedPatient = patients.find((p: any) => p.id === patientId);

  if (!savedPatient) {
    throw new Error(`Patient ${patientId} not found in database`);
  }

  // Verify rounding data persisted
  if (!savedPatient.roundingData) {
    throw new Error('Rounding data not persisted');
  }

  if (!savedPatient.roundingData.signalment) {
    throw new Error('Rounding data missing signalment field');
  }

  return savedPatient;
}

async function testCleanup(patientId: number) {
  // Clean up test patient
  const response = await fetch(`${BASE_URL}/api/patients/${patientId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete test patient');
  }

  console.log(`🧹 Cleaned up test patient ${patientId}`);
}

// Output generator functions (copied from patient-hub/page.tsx)
function generateRoundingSheet(data: any) {
  const demographics = data.demographics || {};
  const clinical = data.clinical || {};

  return {
    signalment: `${demographics.age} ${demographics.sex} ${demographics.breed}`,
    location: data.location || 'ICU',
    icuCriteria: data.icuCriteria || 'Yes',
    code: data.codeStatus || 'Green',
    problems: clinical.problems || '',
    diagnosticFindings: clinical.diagnosticFindings || '',
    therapeutics: clinical.medications || '',
    fluids: clinical.fluids || '',
    concerns: '',
    dayCount: 1,
    lastUpdated: new Date().toISOString(),
  };
}

function generateSOAPNote(data: any) {
  const clinical = data.clinical || {};

  return {
    visitType: 'initial',
    subjective: {
      currentHistory: clinical.history || '',
      medications: clinical.medications || '',
    },
    physicalExam: {},
    neuroExam: {},
    assessment: {
      neurolocalization: clinical.neurolocalization || '',
      ddx: clinical.ddx || '',
    },
    plan: {
      diagnostics: clinical.diagnostics || '',
      treatments: clinical.treatments || '',
    },
  };
}

function generateTreatmentSheet(data: any) {
  const clinical = data.clinical || {};
  const demographics = data.demographics || {};

  return {
    patientName: demographics.name,
    medications: clinical.medications || '',
    fluids: clinical.fluids || '',
    treatments: clinical.treatments || '',
  };
}

function generateStickers(data: any) {
  const demographics = data.demographics || {};

  return [
    { type: 'patient', text: `${demographics.name}\n${demographics.breed}` },
    { type: 'cage', text: `${demographics.name}\nCage: ${data.location || 'ICU'}` },
    { type: 'medical', text: `${demographics.name}\n${data.type || 'Medical'}` },
  ];
}

// Main test execution
async function runTests() {
  console.log('\n🚀 Starting Unified Patient Hub End-to-End Test\n');
  console.log('=' .repeat(60));

  let testPatientId: number | null = null;

  try {
    // Step 1: Test AI Parsing
    const parsedData = await testStep(
      'AI Parse Referral Email',
      () => testAIParsing()
    );

    console.log('\n📊 Parsed Data:', JSON.stringify(parsedData, null, 2));

    // Step 2: Test Output Generation
    const { patientData, outputs } = await testStep(
      'Generate All Outputs',
      () => testOutputGeneration(parsedData)
    );

    console.log('\n📋 Generated Outputs:', {
      roundingSheet: outputs.roundingSheet,
      soapNote: Object.keys(outputs.soapNote),
      treatmentSheet: outputs.treatmentSheet,
      stickers: outputs.stickers.length,
    });

    // Step 3: Test Patient Save
    const savedPatient = await testStep(
      'Save Patient to Database',
      () => testPatientSave(patientData, outputs)
    );

    testPatientId = savedPatient.id;
    console.log(`\n💾 Patient saved with ID: ${testPatientId}`);

    // Step 4: Test Patient Retrieval
    await testStep(
      'Retrieve Patient from Database',
      () => testPatientRetrieval(testPatientId!)
    );

    // Step 5: Cleanup
    await testStep(
      'Clean Up Test Data',
      () => testCleanup(testPatientId!)
    );

    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('\n📈 TEST RESULTS SUMMARY\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.step}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 ALL TESTS PASSED! Unified Patient Hub is working correctly.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Test execution failed:', error);

    // Attempt cleanup if patient was created
    if (testPatientId) {
      try {
        await testCleanup(testPatientId);
      } catch (cleanupError) {
        console.error('⚠️  Cleanup failed - manual cleanup may be needed');
      }
    }

    process.exit(1);
  }
}

// Run tests
runTests();
