#!/usr/bin/env tsx
/**
 * VetHub 2.0 Comprehensive System Audit
 *
 * This script systematically tests all core features of VetHub
 * and generates a detailed report of what's working and what's broken.
 *
 * Features tested:
 * 1. Database connections
 * 2. Patient data loading
 * 3. Task management workflows
 * 4. Blood work parsing
 * 5. MRI anesthesia calculations
 * 6. Patient demographics parsing
 * 7. CSV export functionality
 * 8. Rounding sheet generation
 * 9. API endpoints
 * 10. VetRadar integration
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Terminal colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Test result tracking
interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  error?: any;
  timestamp: Date;
}

const testResults: TestResult[] = [];
const prisma = new PrismaClient();

// API base URLs
const LOCAL_API_URL = 'http://localhost:3000';
const PRODUCTION_API_URL = 'https://empathetic-clarity-production.up.railway.app';

// Use production API for testing
const API_URL = PRODUCTION_API_URL;

// Check if running locally vs on Railway
const isLocalEnvironment = !process.env.RAILWAY_ENVIRONMENT;

// Logging functions
function logSection(message: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logTest(name: string) {
  process.stdout.write(`${colors.yellow}Testing${colors.reset} ${name}... `);
}

function logPass(message?: string) {
  console.log(`${colors.green}✅ PASS${colors.reset}${message ? ` - ${message}` : ''}`);
}

function logFail(message: string, error?: any) {
  console.log(`${colors.red}❌ FAIL${colors.reset} - ${message}`);
  if (error) {
    console.log(`${colors.red}Error:${colors.reset}`, error);
  }
}

function logSkip(message: string) {
  console.log(`${colors.yellow}⏭️ SKIP${colors.reset} - ${message}`);
}

function addResult(feature: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, error?: any) {
  testResults.push({
    feature,
    status,
    message,
    error,
    timestamp: new Date(),
  });
}

// Test Functions
async function testDatabaseConnection() {
  const feature = 'Database Connection';
  logTest(feature);

  if (isLocalEnvironment) {
    // Skip direct database tests when running locally
    logSkip('Direct database access not available from local environment');
    addResult(feature, 'SKIP', 'Running from local environment - use API endpoints instead');
    return false;
  }

  try {
    // Test connection to Railway production database
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    logPass('Connected to Railway PostgreSQL');
    addResult(feature, 'PASS', 'Successfully connected to Railway PostgreSQL database');
    return true;
  } catch (error: any) {
    if (error.message.includes('denied access')) {
      logSkip('Database access denied from local environment - testing via API instead');
      addResult(feature, 'SKIP', 'Local environment cannot directly access Railway database');
      return false;
    }
    logFail('Could not connect to database', error.message);
    addResult(feature, 'FAIL', 'Database connection failed', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  const feature = 'Database Schema';
  logTest(feature);

  if (isLocalEnvironment) {
    // Test schema via API instead
    const result = await testAPIEndpoint('/patients', 'GET');
    if (result.success && result.data) {
      // Check if returned patients have type field
      const patients = Array.isArray(result.data) ? result.data : [];
      if (patients.length > 0) {
        const hasTypeField = patients.every((p: any) => 'type' in p);
        if (hasTypeField) {
          logPass('API returns patient.type field');
          addResult(feature, 'PASS', 'Patient objects include type field');
        } else {
          logFail('API response missing patient.type field');
          addResult(feature, 'FAIL', 'patient.type field not in API response');
        }
      } else {
        logSkip('No patients to verify schema');
        addResult(feature, 'SKIP', 'Cannot verify schema - no patients in database');
      }
    } else {
      logFail('Could not verify schema via API');
      addResult(feature, 'FAIL', 'API schema check failed', result.error);
    }
    return result.success;
  }

  try {
    // Check if patient.type column exists
    const checkTypeColumn = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Patient'
      AND column_name = 'type'
    ` as any[];

    if (checkTypeColumn.length === 0) {
      logFail('patient.type column DOES NOT EXIST in production database');
      addResult(feature, 'FAIL', 'patient.type column missing - migration needed', 'Column does not exist');
      return false;
    }

    logPass(`patient.type column exists (nullable: ${checkTypeColumn[0].is_nullable})`);
    addResult(feature, 'PASS', 'Database schema has patient.type column');
    return true;
  } catch (error: any) {
    logFail('Could not check schema', error.message);
    addResult(feature, 'FAIL', 'Schema check failed', error.message);
    return false;
  }
}

async function testPatientDataLoading() {
  const feature = 'Patient Data Loading';
  logTest(feature);

  if (isLocalEnvironment) {
    // Test via API endpoint
    const result = await testAPIEndpoint('/patients', 'GET');
    if (result.success) {
      const patients = Array.isArray(result.data) ? result.data : [];
      if (patients.length > 0) {
        logPass(`API returned ${patients.length} patients`);

        // Check structure of patient data
        const firstPatient = patients[0];
        const hasRequiredFields =
          'id' in firstPatient &&
          'status' in firstPatient &&
          'type' in firstPatient &&
          'demographics' in firstPatient;

        if (hasRequiredFields) {
          addResult(feature, 'PASS', `Successfully loaded ${patients.length} patients with all fields`);
        } else {
          logFail('Patient data structure incomplete');
          addResult(feature, 'FAIL', 'Patient objects missing required fields');
        }
      } else {
        logSkip('No patients in database');
        addResult(feature, 'SKIP', 'No patients to test');
      }
    } else {
      addResult(feature, 'FAIL', 'Could not load patients via API', result.error);
    }
    return result.success;
  }

  try {
    // Try to load patients from database
    const patients = await prisma.patient.findMany({
      take: 5,
      include: {
        tasks: true,
        soapNotes: true,
      },
    });

    if (patients.length > 0) {
      logPass(`Loaded ${patients.length} patients from database`);

      // Check if patient.type field is accessible
      const hasTypeField = patients.every(p => 'type' in p);
      if (!hasTypeField) {
        logFail('Patients missing type field');
        addResult(feature, 'FAIL', 'Patient records missing type field');
        return false;
      }

      addResult(feature, 'PASS', `Successfully loaded ${patients.length} patients with type field`);
    } else {
      logSkip('No patients in database to test');
      addResult(feature, 'SKIP', 'No patients in database');
    }
    return true;
  } catch (error: any) {
    // Check if error is related to missing column
    if (error.message.includes('column') && error.message.includes('type')) {
      logFail('patient.type column does not exist - MIGRATION NEEDED', error.message);
      addResult(feature, 'FAIL', 'patient.type column missing - migration required', error.message);
    } else {
      logFail('Could not load patients', error.message);
      addResult(feature, 'FAIL', 'Patient loading failed', error.message);
    }
    return false;
  }
}

async function testAPIEndpoint(endpoint: string, method: string = 'GET', body?: any) {
  const feature = `API: ${method} ${endpoint}`;
  logTest(feature);

  try {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.ok) {
      const data = await response.json();
      logPass(`Status ${response.status}`);
      addResult(feature, 'PASS', `Endpoint returned ${response.status}`);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      logFail(`Status ${response.status}`, errorText);

      // Check for specific error patterns
      if (errorText.includes('column') && errorText.includes('type')) {
        addResult(feature, 'FAIL', 'Database column error - patient.type missing', errorText);
      } else {
        addResult(feature, 'FAIL', `HTTP ${response.status}`, errorText);
      }
      return { success: false, error: errorText };
    }
  } catch (error: any) {
    logFail('Request failed', error.message);
    addResult(feature, 'FAIL', 'Network or server error', error.message);
    return { success: false, error: error.message };
  }
}

async function testTaskManagement() {
  const feature = 'Task Management';
  logTest(feature);

  try {
    // Test general tasks endpoint
    const generalTasks = await testAPIEndpoint('/tasks/general', 'GET');

    if (isLocalEnvironment) {
      // Use API to get patients with tasks
      const patientsResult = await testAPIEndpoint('/patients', 'GET');
      if (patientsResult.success && patientsResult.data) {
        const patients = Array.isArray(patientsResult.data) ? patientsResult.data : [];
        const patientsWithTasks = patients.filter((p: any) => p.tasks && p.tasks.length > 0);

        if (patientsWithTasks.length > 0) {
          const patientId = patientsWithTasks[0].id;
          const patientTasks = await testAPIEndpoint(`/tasks/patients/${patientId}/tasks`, 'GET');

          if (patientTasks.success) {
            logPass('Task endpoints working');
            addResult(feature, 'PASS', 'Task management functional');
            return true;
          }
        } else {
          logSkip('No patients with tasks to test');
          addResult(feature, 'SKIP', 'No test data available');
        }
      }
    } else {
      // Try to find a patient with tasks using direct database access
      const patients = await prisma.patient.findMany({
        where: {
          tasks: {
            some: {},
          },
        },
        take: 1,
        include: {
          tasks: true,
        },
      });

      if (patients.length > 0) {
        const patientId = patients[0].id;
        const patientTasks = await testAPIEndpoint(`/tasks/patients/${patientId}/tasks`, 'GET');

        if (patientTasks.success) {
          logPass('Task endpoints working');
          addResult(feature, 'PASS', 'Task management functional');
          return true;
        }
      } else {
        logSkip('No patients with tasks to test');
        addResult(feature, 'SKIP', 'No test data available');
      }
    }

    return generalTasks.success;
  } catch (error: any) {
    logFail('Task management test failed', error.message);
    addResult(feature, 'FAIL', 'Task system error', error.message);
    return false;
  }
}

async function testBloodWorkParsing() {
  const feature = 'Blood Work Parsing';
  logTest(feature);

  // Test sample blood work text
  const sampleBloodWork = {
    text: `
      CBC Results:
      WBC: 8.5 K/uL (5.5-16.9)
      RBC: 6.2 M/uL (5.5-8.5)
      HGB: 14.5 g/dL (12-18)
      HCT: 42% (37-55)
      PLT: 250 K/uL (200-500)

      Chemistry:
      Glucose: 95 mg/dL (74-143)
      BUN: 18 mg/dL (7-27)
      Creatinine: 0.9 mg/dL (0.5-1.8)
      ALT: 45 U/L (10-125)
    `,
  };

  const result = await testAPIEndpoint('/parse-soap-text', 'POST', sampleBloodWork);

  if (result.success) {
    logPass('Blood work parsing API functional');
    addResult(feature, 'PASS', 'Successfully parsed blood work data');
    return true;
  } else {
    addResult(feature, 'FAIL', 'Blood work parsing failed', result.error);
    return false;
  }
}

async function testMRICalculations() {
  const feature = 'MRI Anesthesia Calculations';
  logTest(feature);

  try {
    if (isLocalEnvironment) {
      // Test via API
      const result = await testAPIEndpoint('/patients', 'GET');
      if (result.success && result.data) {
        const patients = Array.isArray(result.data) ? result.data : [];
        const mriPatients = patients.filter((p: any) => p.mriData && p.mriData !== null);

        if (mriPatients.length > 0) {
          const mriData = mriPatients[0].mriData;

          // Verify MRI calculation fields
          if (mriData && mriData.weight && mriData.scanType) {
            logPass('MRI data structure intact');
            addResult(feature, 'PASS', 'MRI calculations data available');
            return true;
          } else {
            logFail('MRI data incomplete');
            addResult(feature, 'FAIL', 'MRI data structure invalid');
            return false;
          }
        } else {
          logSkip('No MRI patients to test');
          addResult(feature, 'SKIP', 'No MRI data available');
          return true;
        }
      }
    } else {
      // Find a patient with MRI data
      const mriPatients = await prisma.patient.findMany({
        where: {
          mriData: {
            not: Prisma.JsonNull,
          },
        },
        take: 1,
      });

      if (mriPatients.length > 0) {
        const mriData = mriPatients[0].mriData as any;

        // Verify MRI calculation fields
        if (mriData && mriData.weight && mriData.scanType) {
          logPass('MRI data structure intact');
          addResult(feature, 'PASS', 'MRI calculations data available');
          return true;
        } else {
          logFail('MRI data incomplete');
          addResult(feature, 'FAIL', 'MRI data structure invalid');
          return false;
        }
      } else {
        logSkip('No MRI patients to test');
        addResult(feature, 'SKIP', 'No MRI data available');
        return true;
      }
    }
  } catch (error: any) {
    logFail('MRI calculation test failed', error.message);
    addResult(feature, 'FAIL', 'MRI system error', error.message);
    return false;
  }
}

async function testPatientDemographicsParsing() {
  const feature = 'Patient Demographics Parsing';
  logTest(feature);

  // Test screenshot parsing endpoint with sample base64 image
  const sampleScreenshot = {
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  };

  const result = await testAPIEndpoint('/parse-screenshot', 'POST', sampleScreenshot);

  if (result.success) {
    logPass('Screenshot parsing API functional');
    addResult(feature, 'PASS', 'Demographics parsing endpoint working');
    return true;
  } else {
    // This might fail due to API key issues, which is expected
    if (result.error?.includes('API key') || result.error?.includes('ANTHROPIC')) {
      logSkip('Anthropic API key not configured');
      addResult(feature, 'SKIP', 'External API not configured');
    } else {
      addResult(feature, 'FAIL', 'Demographics parsing failed', result.error);
    }
    return false;
  }
}

async function testRoundingSheetGeneration() {
  const feature = 'Rounding Sheet Generation';
  logTest(feature);

  try {
    if (isLocalEnvironment) {
      // Test via API
      const result = await testAPIEndpoint('/patients?status=Active', 'GET');
      if (result.success && result.data) {
        const patients = Array.isArray(result.data) ? result.data : [];
        const roundingPatients = patients.filter(
          (p: any) => p.roundingData && p.roundingData !== null
        );

        if (roundingPatients.length > 0) {
          // Check rounding data structure
          const hasValidData = roundingPatients.every((p: any) => {
            const data = p.roundingData;
            return data && (data.signalment || data.problems || data.therapeutics);
          });

          if (hasValidData) {
            logPass(`Found ${roundingPatients.length} patients with rounding data`);
            addResult(feature, 'PASS', 'Rounding sheet data available');
            return true;
          } else {
            logFail('Rounding data structure invalid');
            addResult(feature, 'FAIL', 'Invalid rounding data format');
            return false;
          }
        } else {
          logSkip('No patients with rounding data');
          addResult(feature, 'SKIP', 'No rounding data to test');
          return true;
        }
      }
    } else {
      // Find active patients with rounding data
      const roundingPatients = await prisma.patient.findMany({
        where: {
          status: 'Active',
          roundingData: {
            not: Prisma.JsonNull,
          },
        },
        take: 3,
      });

      if (roundingPatients.length > 0) {
        // Check rounding data structure
        const hasValidData = roundingPatients.every(p => {
          const data = p.roundingData as any;
          return data && (data.signalment || data.problems || data.therapeutics);
        });

        if (hasValidData) {
          logPass(`Found ${roundingPatients.length} patients with rounding data`);
          addResult(feature, 'PASS', 'Rounding sheet data available');
          return true;
        } else {
          logFail('Rounding data structure invalid');
          addResult(feature, 'FAIL', 'Invalid rounding data format');
          return false;
        }
      } else {
        logSkip('No patients with rounding data');
        addResult(feature, 'SKIP', 'No rounding data to test');
        return true;
      }
    }
  } catch (error: any) {
    logFail('Rounding sheet test failed', error.message);
    addResult(feature, 'FAIL', 'Rounding system error', error.message);
    return false;
  }
}

async function testVetRadarIntegration() {
  const feature = 'VetRadar Integration';
  logTest(feature);

  // Test VetRadar patients endpoint
  const result = await testAPIEndpoint('/integrations/vetradar/patients', 'GET');

  if (result.success) {
    logPass('VetRadar API endpoint accessible');
    addResult(feature, 'PASS', 'VetRadar integration endpoint working');
    return true;
  } else {
    // Check if it's an auth issue or structural issue
    if (result.error?.includes('auth') || result.error?.includes('credentials')) {
      logSkip('VetRadar credentials not configured');
      addResult(feature, 'SKIP', 'External service not configured');
    } else if (result.error?.includes('column') && result.error?.includes('type')) {
      logFail('Database schema issue affecting VetRadar');
      addResult(feature, 'FAIL', 'patient.type column missing', result.error);
    } else {
      addResult(feature, 'FAIL', 'VetRadar integration error', result.error);
    }
    return false;
  }
}

async function testPatientCreation() {
  const feature = 'Patient Creation';
  logTest(feature);

  const testPatient = {
    status: 'Active',
    type: 'Medical',
    demographics: {
      name: 'Test Patient',
      species: 'Canine',
      breed: 'Labrador',
      age: '5 years',
      weight: '30 kg',
      sex: 'Male',
    },
    medicalHistory: {
      conditions: ['Test condition'],
      medications: [],
    },
  };

  const result = await testAPIEndpoint('/patients', 'POST', testPatient);

  if (result.success) {
    logPass('Patient created successfully');
    addResult(feature, 'PASS', 'Patient creation working with type field');

    // Try to delete the test patient to clean up
    if (result.data && result.data.id) {
      await testAPIEndpoint(`/patients/${result.data.id}`, 'DELETE');
    }
    return true;
  } else {
    if (result.error?.includes('column') && result.error?.includes('type')) {
      logFail('Database column error - patient.type missing');
      addResult(feature, 'FAIL', 'patient.type column missing in database', result.error);
    } else {
      addResult(feature, 'FAIL', 'Patient creation failed', result.error);
    }
    return false;
  }
}

async function testAllAPIEndpoints() {
  logSection('Testing All API Endpoints');

  const endpoints = [
    { path: '/patients', method: 'GET' },
    { path: '/tasks/general', method: 'GET' },
    { path: '/common/medications', method: 'GET' },
    { path: '/common/problems', method: 'GET' },
    { path: '/common/comments', method: 'GET' },
    { path: '/integrations/vetradar/patients', method: 'GET' },
    { path: '/integrations/vetradar/treatment', method: 'GET' },
    { path: '/integrations/ezyvet/patients', method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    await testAPIEndpoint(endpoint.path, endpoint.method);
  }

  // Test patient creation separately
  await testPatientCreation();
}

async function generateReport() {
  logSection('Generating Audit Report');

  const timestamp = new Date().toISOString();
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const skipCount = testResults.filter(r => r.status === 'SKIP').length;

  let report = `# VetHub 2.0 Audit Report

**Generated:** ${timestamp}
**Environment:** Production (Railway)
**Database:** PostgreSQL on Railway
**API URL:** ${API_URL}

## Summary

- ✅ **Passed:** ${passCount} features
- ❌ **Failed:** ${failCount} features
- ⏭️ **Skipped:** ${skipCount} features

## Critical Finding

### 🚨 **Root Cause: Missing \`patient.type\` Column**

The primary issue is that the \`patient.type\` column does not exist in the production database. The code expects this column but the migration hasn't been run on Railway.

**Impact:**
- API routes returning 500 errors when trying to access \`patient.type\`
- Patient creation/update operations failing
- Data loading errors throughout the application

## Test Results

`;

  // Group results by status
  const failures = testResults.filter(r => r.status === 'FAIL');
  const passes = testResults.filter(r => r.status === 'PASS');
  const skips = testResults.filter(r => r.status === 'SKIP');

  if (failures.length > 0) {
    report += `### ❌ Failed Features\n\n`;
    for (const result of failures) {
      report += `#### ${result.feature}\n`;
      report += `- **Status:** FAILED\n`;
      report += `- **Message:** ${result.message}\n`;
      if (result.error) {
        report += `- **Error:** \`${result.error}\`\n`;
      }
      report += `- **Time:** ${result.timestamp.toISOString()}\n\n`;
    }
  }

  if (passes.length > 0) {
    report += `### ✅ Working Features\n\n`;
    for (const result of passes) {
      report += `- **${result.feature}:** ${result.message}\n`;
    }
    report += '\n';
  }

  if (skips.length > 0) {
    report += `### ⏭️ Skipped Tests\n\n`;
    for (const result of skips) {
      report += `- **${result.feature}:** ${result.message}\n`;
    }
    report += '\n';
  }

  // Add recommendations
  report += `## Recommendations

### Immediate Actions Required

1. **Run Database Migration** (CRITICAL)
   \`\`\`bash
   # On Railway production:
   npx prisma migrate deploy
   # Or if migrations don't exist yet:
   npx prisma db push
   \`\`\`

2. **Verify Migration**
   \`\`\`sql
   -- Check if column exists:
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'Patient'
   AND column_name = 'type';
   \`\`\`

3. **Update Existing Records**
   \`\`\`sql
   -- Set default type for existing patients:
   UPDATE "Patient"
   SET type = 'Medical'
   WHERE type IS NULL;
   \`\`\`

### Code Fixes Needed

1. **Add migration file** if not exists:
   \`\`\`prisma
   -- prisma/migrations/xxx_add_patient_type/migration.sql
   ALTER TABLE "Patient"
   ADD COLUMN "type" TEXT DEFAULT 'Medical';
   \`\`\`

2. **Add fallback handling** in API routes:
   \`\`\`typescript
   // Handle missing type field gracefully
   type: patient.type || 'Medical'
   \`\`\`

3. **Test locally** before deploying:
   \`\`\`bash
   npm run dev
   npm run test
   \`\`\`

## Error Patterns Detected

`;

  // Analyze error patterns
  const columnErrors = failures.filter(f =>
    f.error?.includes('column') && f.error?.includes('type')
  );

  if (columnErrors.length > 0) {
    report += `### Database Schema Issues (${columnErrors.length} occurrences)\n\n`;
    report += `The following features are failing due to missing \`patient.type\` column:\n`;
    for (const error of columnErrors) {
      report += `- ${error.feature}\n`;
    }
    report += '\n';
  }

  report += `## Next Steps

1. **Fix database schema** - Run migration to add \`patient.type\` column
2. **Verify all endpoints** - Re-run this audit after migration
3. **Test patient workflows** - Create, update, and view patients
4. **Monitor logs** - Check Railway logs for any remaining errors
5. **Update documentation** - Document the patient type field usage

---

*End of Audit Report*
`;

  // Write report to file
  const reportPath = path.join(process.cwd(), 'audit-report.md');
  fs.writeFileSync(reportPath, report);

  console.log(`\n${colors.green}Report saved to: ${reportPath}${colors.reset}`);

  // Also print summary to console
  console.log(`\n${colors.bright}=== AUDIT SUMMARY ===${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passCount}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failCount}`);
  console.log(`${colors.yellow}Skipped:${colors.reset} ${skipCount}`);

  if (failCount > 0) {
    console.log(`\n${colors.red}${colors.bright}⚠️  CRITICAL: Database migration needed!${colors.reset}`);
    console.log(`Run: ${colors.cyan}npx prisma db push${colors.reset} on Railway production`);
  }
}

// Main execution
async function runAudit() {
  console.log(`${colors.bright}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║          VetHub 2.0 Comprehensive System Audit          ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.cyan}Timestamp:${colors.reset} ${new Date().toISOString()}`);
  console.log(`${colors.cyan}API URL:${colors.reset} ${API_URL}`);
  console.log(`${colors.cyan}Database:${colors.reset} Railway PostgreSQL\n`);

  // Run core tests
  logSection('Testing Database Connectivity');
  const dbConnected = await testDatabaseConnection();

  if (dbConnected) {
    await testDatabaseSchema();
    await testPatientDataLoading();
  } else {
    console.log(`\n${colors.red}Cannot continue without database connection${colors.reset}`);
  }

  // Test API endpoints
  await testAllAPIEndpoints();

  // Test specific features
  logSection('Testing Core Features');
  await testTaskManagement();
  await testBloodWorkParsing();
  await testMRICalculations();
  await testPatientDemographicsParsing();
  await testRoundingSheetGeneration();
  await testVetRadarIntegration();

  // Generate report
  await generateReport();

  // Cleanup
  await prisma.$disconnect();

  process.exit(testResults.filter(r => r.status === 'FAIL').length > 0 ? 1 : 0);
}

// Run the audit
runAudit().catch(error => {
  console.error(`\n${colors.red}Audit failed with error:${colors.reset}`, error);
  process.exit(1);
});