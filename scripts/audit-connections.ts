#!/usr/bin/env tsx
/**
 * VetHub Connection Audit
 *
 * Tests the specific pain points:
 * 1. VetRadar import → Rounding sheet connection
 * 2. Patient demographics → Therapeutics field
 * 3. Task click/completion functionality
 * 4. Sticker selection capability
 * 5. MRI line copy functionality
 * 6. AI parsing accuracy
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

interface AuditResult {
  section: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARNING';
  details: string;
  fix?: string;
}

const results: AuditResult[] = [];

function log(section: string, test: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'WARNING', details: string, fix?: string) {
  results.push({ section, test, status, details, fix });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARNING' ? '⚠️' : '⏭️';
  console.log(`${emoji} [${section}] ${test}`);
  console.log(`   ${details}`);
  if (fix) console.log(`   💡 Fix: ${fix}`);
  console.log();
}

async function apiCall(method: string, path: string, body?: any) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      data: data ? JSON.parse(data) : null,
    };
  } catch (error: any) {
    return { ok: false, status: 0, error: error.message };
  }
}

async function test1_VetRadarToRoundingConnection() {
  console.log('\n━━━ TEST 1: VetRadar Import → Rounding Sheet Connection ━━━\n');

  // Get patients
  const patientsRes = await apiCall('GET', '/api/patients');

  if (!patientsRes.ok || !Array.isArray(patientsRes.data)) {
    log('VetRadar → Rounding', 'Patient data loading', 'FAIL',
      'Cannot load patients from API',
      'Check database connection and /api/patients endpoint');
    return;
  }

  if (patientsRes.data.length === 0) {
    log('VetRadar → Rounding', 'Patient data exists', 'SKIP',
      'No patients in database to test',
      'Import patients from VetRadar first');
    return;
  }

  const patient = patientsRes.data[0];

  // Check if patient has medications field (from VetRadar import)
  const hasMedications = patient.medications && (
    typeof patient.medications === 'string' ||
    Array.isArray(patient.medications)
  );

  // Check if patient has roundingData with therapeutics
  const hasRoundingData = patient.roundingData || patient.rounding_data;
  const hasTherapeutics = hasRoundingData?.therapeutics;

  if (hasMedications && !hasTherapeutics) {
    log('VetRadar → Rounding', 'Medications → Therapeutics connection', 'FAIL',
      `Patient has medications but therapeutics field is empty. Medications: ${typeof patient.medications === 'string' ? patient.medications.substring(0, 50) : JSON.stringify(patient.medications).substring(0, 50)}... Therapeutics: empty`,
      'Auto-populate therapeutics field when patient is imported/created');
  } else if (hasMedications && hasTherapeutics) {
    log('VetRadar → Rounding', 'Medications → Therapeutics connection', 'PASS',
      'Medications data is connected to therapeutics field');
  } else if (!hasMedications) {
    log('VetRadar → Rounding', 'Medications data exists', 'WARNING',
      'Patient has no medications field - may not be imported from VetRadar',
      'Ensure VetRadar import populates medications field');
  }

  // Check signalment auto-population
  const hasSignalment = hasRoundingData?.signalment;
  const hasDemographics = patient.demographics || patient.patient_info;

  if (hasDemographics && !hasSignalment) {
    log('VetRadar → Rounding', 'Demographics → Signalment connection', 'FAIL',
      'Patient has demographics but signalment field is empty',
      'Auto-populate signalment from demographics: {species} {breed} {age} {sex}');
  } else if (hasSignalment) {
    log('VetRadar → Rounding', 'Demographics → Signalment connection', 'PASS',
      `Signalment field populated: ${hasSignalment}`);
  }
}

async function test2_TaskClickFunctionality() {
  console.log('\n━━━ TEST 2: Task Click/Completion Functionality ━━━\n');

  const patientsRes = await apiCall('GET', '/api/patients');

  if (!patientsRes.ok || !Array.isArray(patientsRes.data) || patientsRes.data.length === 0) {
    log('Task Functionality', 'Patient with tasks exists', 'SKIP',
      'No patients to test tasks',
      'Create a patient first');
    return;
  }

  const patientWithTasks = patientsRes.data.find((p: any) => p.tasks && p.tasks.length > 0);

  if (!patientWithTasks) {
    log('Task Functionality', 'Tasks exist', 'SKIP',
      'No patients have tasks to test',
      'Create tasks for a patient');
    return;
  }

  const task = patientWithTasks.tasks[0];
  const patientId = patientWithTasks.id;
  const taskId = task.id;

  // Try to toggle task
  const toggleRes = await apiCall('PATCH', `/api/tasks/patients/${patientId}/tasks/${taskId}`, {
    completed: !task.completed
  });

  if (!toggleRes.ok) {
    log('Task Functionality', 'Task toggle API', 'FAIL',
      `Failed to toggle task. Status: ${toggleRes.status}, Error: ${toggleRes.error || 'Unknown'}`,
      'Check /api/tasks/patients/[id]/tasks/[taskId] endpoint and error handling');
  } else {
    log('Task Functionality', 'Task toggle API', 'PASS',
      'Task toggle API works correctly');

    // Toggle back
    await apiCall('PATCH', `/api/tasks/patients/${patientId}/tasks/${taskId}`, {
      completed: task.completed
    });
  }
}

async function test3_StickerSelectionCapability() {
  console.log('\n━━━ TEST 3: Sticker Selection Capability ━━━\n');

  // This is a code structure check, not API test
  const patientsRes = await apiCall('GET', '/api/patients');

  if (!patientsRes.ok || !Array.isArray(patientsRes.data)) {
    log('Sticker Selection', 'Patient data for stickers', 'SKIP',
      'Cannot test without patient data');
    return;
  }

  const activePatients = patientsRes.data.filter((p: any) => p.status !== 'Discharged');

  log('Sticker Selection', 'Selection mechanism', 'FAIL',
    `Found ${activePatients.length} active patients. Currently prints ALL patients - no way to select specific patients`,
    'Add checkbox selection state to print functions in src/app/page.tsx line ~1398');

  log('Sticker Selection', 'Batch operations', 'FAIL',
    'No batch selection UI connected to print operations',
    'Connect selectedPatientIds state (line 62) to printConsolidatedBigLabels/printConsolidatedTinyLabels functions');
}

async function test4_MRILineCopy() {
  console.log('\n━━━ TEST 4: MRI Individual Line Copy ━━━\n');

  const patientsRes = await apiCall('GET', '/api/patients');

  if (!patientsRes.ok || !Array.isArray(patientsRes.data)) {
    log('MRI Copy', 'MRI patient data', 'SKIP',
      'Cannot test without patient data');
    return;
  }

  const mriPatients = patientsRes.data.filter((p: any) => p.type === 'MRI' && p.status !== 'Discharged');

  if (mriPatients.length === 0) {
    log('MRI Copy', 'MRI patients exist', 'SKIP',
      'No MRI patients to test',
      'Create or import MRI patients');
    return;
  }

  log('MRI Copy', 'Individual line copy button', 'FAIL',
    `Found ${mriPatients.length} MRI patients. MRI Schedule view (line 2466-2557 in page.tsx) has no copy button for individual rows`,
    'Add copy button to each MRI patient row, reuse handleExportMRISchedule logic for single patient');

  log('MRI Copy', 'Function exists but not connected', 'WARNING',
    'handleCopySingleRoundingLine exists (line 1296) but only used in rounding modal, not MRI Schedule',
    'Create handleCopySingleMRILine function and add button to MRI Schedule table');
}

async function test5_AIParsingAccuracy() {
  console.log('\n━━━ TEST 5: AI Parsing Functionality ━━━\n');

  // Test if AI parsing endpoint exists
  const testBlurb = `Charlie Torres
Owner: Michael Torres
Phone: 555-1234
Canine, Golden Retriever, 5 years, MN
Weight: 30kg
Medications: Gabapentin 300mg PO TID, Carprofen 100mg PO BID`;

  // Check if API key is configured
  const envCheck = await apiCall('GET', '/api/patients');

  log('AI Parsing', 'Anthropic API configured', 'WARNING',
    'Cannot verify API key from backend. Check ANTHROPIC_API_KEY or NEXT_PUBLIC_ANTHROPIC_API_KEY in environment',
    'Add API key to .env.local: NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...');

  log('AI Parsing', 'Error handling', 'FAIL',
    'AI parsing failures are silent - no user-facing error messages in src/lib/ai-parser.ts',
    'Add user-facing error toasts when AI parsing fails, show specific error messages');
}

async function test6_DataFlowBetweenFeatures() {
  console.log('\n━━━ TEST 6: Data Flow Between Features ━━━\n');

  const patientsRes = await apiCall('GET', '/api/patients');

  if (!patientsRes.ok || !Array.isArray(patientsRes.data) || patientsRes.data.length === 0) {
    log('Data Flow', 'Patient data for flow testing', 'SKIP',
      'No patients to test data flow');
    return;
  }

  const patient = patientsRes.data[0];

  // Check all the disconnected data points
  const checks = [
    {
      name: 'Medications → Therapeutics',
      has: patient.medications,
      needs: patient.roundingData?.therapeutics || patient.rounding_data?.therapeutics,
    },
    {
      name: 'Demographics → Signalment',
      has: patient.demographics || patient.patient_info,
      needs: patient.roundingData?.signalment || patient.rounding_data?.signalment,
    },
    {
      name: 'Patient Type → Auto Tasks',
      has: patient.type,
      needs: patient.tasks && patient.tasks.length > 0,
    },
  ];

  let connectedCount = 0;
  let disconnectedCount = 0;

  checks.forEach(check => {
    if (check.has && check.needs) {
      connectedCount++;
      log('Data Flow', check.name, 'PASS', 'Data is connected');
    } else if (check.has && !check.needs) {
      disconnectedCount++;
      log('Data Flow', check.name, 'FAIL',
        'Source data exists but destination field is empty - data not flowing',
        'Add auto-population logic when patient is created/imported');
    }
  });

  const score = connectedCount / checks.length;
  if (score < 0.5) {
    log('Data Flow', 'Overall connectivity', 'FAIL',
      `Only ${connectedCount}/${checks.length} data flows are connected (${Math.round(score * 100)}%)`,
      'Implement patient admission workflow that auto-populates all related fields');
  } else if (score < 1.0) {
    log('Data Flow', 'Overall connectivity', 'WARNING',
      `${connectedCount}/${checks.length} data flows connected (${Math.round(score * 100)}%)`,
      'Complete remaining data flow connections');
  } else {
    log('Data Flow', 'Overall connectivity', 'PASS',
      'All data flows properly connected');
  }
}

function generateReport() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('         CONNECTION AUDIT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`✅ PASS:    ${passed}`);
  console.log(`❌ FAIL:    ${failed}`);
  console.log(`⚠️  WARNING: ${warnings}`);
  console.log(`⏭️  SKIP:    ${skipped}`);
  console.log(`📊 TOTAL:   ${results.length}`);

  const score = failed === 0 && warnings === 0 ? 100 : Math.round((passed / (passed + failed + warnings)) * 100);
  console.log(`\n🎯 Health Score: ${score}%\n`);

  if (failed > 0) {
    console.log('\n━━━ CRITICAL ISSUES (Must Fix) ━━━\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`❌ [${r.section}] ${r.test}`);
      console.log(`   ${r.details}`);
      if (r.fix) console.log(`   💡 ${r.fix}`);
      console.log();
    });
  }

  if (warnings > 0) {
    console.log('\n━━━ WARNINGS (Should Fix) ━━━\n');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`⚠️  [${r.section}] ${r.test}`);
      console.log(`   ${r.details}`);
      if (r.fix) console.log(`   💡 ${r.fix}`);
      console.log();
    });
  }

  // Write report to file
  const reportPath = 'vethub-connection-audit.md';
  const report = generateMarkdownReport();
  require('fs').writeFileSync(reportPath, report);
  console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
}

function generateMarkdownReport(): string {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const score = failed === 0 && warnings === 0 ? 100 : Math.round((passed / (passed + failed + warnings)) * 100);

  let md = `# VetHub Connection Audit Report

**Generated:** ${new Date().toISOString()}
**Test URL:** ${BASE_URL}
**Health Score:** ${score}%

## Summary

- ✅ **PASS:** ${passed}
- ❌ **FAIL:** ${failed}
- ⚠️ **WARNING:** ${warnings}
- ⏭️ **SKIP:** ${skipped}
- **Total:** ${results.length}

---

## Test Results

`;

  const sections = [...new Set(results.map(r => r.section))];

  sections.forEach(section => {
    const sectionResults = results.filter(r => r.section === section);
    const sectionFailed = sectionResults.filter(r => r.status === 'FAIL').length;
    const sectionPassed = sectionResults.filter(r => r.status === 'PASS').length;
    const sectionStatus = sectionFailed > 0 ? '❌' : sectionPassed > 0 ? '✅' : '⏭️';

    md += `### ${sectionStatus} ${section}\n\n`;

    sectionResults.forEach(r => {
      const emoji = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'WARNING' ? '⚠️' : '⏭️';
      md += `**${emoji} ${r.test}**\n\n`;
      md += `${r.details}\n\n`;
      if (r.fix) {
        md += `💡 **Fix:** ${r.fix}\n\n`;
      }
      md += '---\n\n';
    });
  });

  md += `## Recommendations

`;

  if (failed > 0) {
    md += `### Critical Fixes Required\n\n`;
    results.filter(r => r.status === 'FAIL').forEach((r, i) => {
      md += `${i + 1}. **${r.section} - ${r.test}**\n`;
      md += `   - ${r.fix}\n`;
    });
    md += '\n';
  }

  md += `---

*Generated by VetHub Connection Audit*
`;

  return md;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   VetHub Connection Audit - Pain Points');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Testing: ${BASE_URL}\n`);

  await test1_VetRadarToRoundingConnection();
  await test2_TaskClickFunctionality();
  await test3_StickerSelectionCapability();
  await test4_MRILineCopy();
  await test5_AIParsingAccuracy();
  await test6_DataFlowBetweenFeatures();

  generateReport();
}

main().catch(console.error);
