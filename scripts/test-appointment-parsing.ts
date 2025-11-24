/**
 * Test appointment parsing with real Riley patient data
 *
 * This tests the parsing API with actual input from production
 * to verify the prompt works before making changes.
 */

const RILEY_DATA = `Patient
Riley (FS)
Patient ID: TF_562510
Date of Birth: 06-29-2019
6 years 4 months 25 days - 16.00kg
Canine - Labradoodle
 Insured

 Complete History
Demeanor
Unknown
Status:
Confirmed
Insurance
Trupanion
TU0003271455
Owner
Benigno, Lauryn

Cellular Ph: 917-991-4429
Current Balance	-$30.00
Consult
Consult # 5869758
11-24-2025
Neurology & Neurosurgery
Clinical Layout: None
Case Owner: Eric Glass, MS, DVM ACVIM
Related Records ( 27 )
Date
Number
10-15-2025
5867078
09-14-2025
5860121
09-11-2025
5859009
12-07-2024
5780780
07-21-2024
5738688
Page:
1
 of 6
SOC Event
Next Due
Rabies
Wellness Exam
Bordetella
DA2PP
Referred By
Clinic - Pleasant Plains Animal Hospital (South)
- Ph; 718-227-8387
Vet - Dr Goldhaber, Jenna
Interested Contacts
Tags
0 Client(s),Canine,Labradoodle,Neurology & Neurosurgery,Neurology Recheck,RB-REFERRAL to Tinton Falls
Presenting Problem
General Description
4 week recheck




11-23-2025 11:38:44am
Presenting Problem:
Riley is a 6y 4mo Labradoodle presenting to RBVH Neurology on 11/24 for a one month recheck of seizures.

NO BROMIDE

Last Visit Changes/Summary: Hospitalized 10/15-10/16/25 for increased frequency of seizures, MRI revealed no structural abnormalities, serology performed (neg) and remained on KBr

Last MRI (brain) on 10/16/25: no structural abnormalities
First MRI on 7/2021: no structural abnormalities (presumed IE)
Last Bloodwork on 10/16/25: CBC/Chem
Last Phenobarbital on 9/11/25: 35.9 (sub therapeutic <15, therapeutic 15-45, ideal 20-30)
Last Bromide level: None

Current History:
Since her last visit, Riley has been doing better. She has still been having seizures but they are less severe.

CSVD: None
PU/PD: None
Appetite: Normal

Current Medications:
Phenobarbital 64.8mg - 1 tab PO q12h
KBr 250mg/mL: 2mL PO q24h
Ellevet

Prior History:

7/2021: seizures started, MRI showed no structural abnormalities
Previous Diagnostics
10/16/25 RBVH Neuro

MRI: no structural abnormalities
Cryptococcus Ag: neg
Distemper: IgG 1:20, IgM <1:10
Neospora Ab: neg
Toxoplasma: IgG neg, IgM neg
NCSU: 4DX neg (partial)
10/15/25 RBVH Neuro

CXR: No radiographic evidence of intrathoracic disease
CBC: nsf
Chem: ALP 578 (H), otherwise nsf
9/11/25 RBVH Neuro
CBC: unremarkable
Chem: ALP 397(H), Chol 405(H)
Pheno: 35.9

7/22/24:
CBC: NSF`;

async function testParsing() {
  console.log('🧪 Testing Appointment Parsing with Riley Data\n');
  console.log('Input length:', RILEY_DATA.length, 'characters\n');

  try {
    const response = await fetch('http://localhost:3000/api/parse-appointment-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: RILEY_DATA }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', result);
      process.exit(1);
    }

    console.log('✅ Parsing successful!\n');
    console.log('Parsed patients:', result.count);
    console.log('\nExtracted data:');
    console.log(JSON.stringify(result.patients, null, 2));

    // Validate expected fields
    console.log('\n📊 Validation:');
    const patient = result.patients[0];

    const checks = [
      { field: 'patientName', expected: 'Riley', actual: patient?.patientName },
      { field: 'age', expected: '6y 4m', actual: patient?.age },
      { field: 'whyHereToday', expected: 'seizure recheck', actual: patient?.whyHereToday },
      { field: 'medications', expected: 'Phenobarbital', actual: patient?.medications },
      { field: 'lastVisit', expected: '10/15-10/16/25', actual: patient?.lastVisit },
      { field: 'mri', expected: '10/16/25', actual: patient?.mri },
      { field: 'bloodwork', expected: 'phenobarbital level', actual: patient?.bloodwork },
    ];

    checks.forEach(({ field, expected, actual }) => {
      const found = actual && actual.toLowerCase().includes(expected.toLowerCase());
      console.log(`  ${found ? '✓' : '✗'} ${field}: ${found ? 'Found' : 'Missing'} (expected: "${expected}", got: "${actual?.substring(0, 50) || 'null'}")`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if dev server is running
console.log('Checking if dev server is running on http://localhost:3000...\n');
fetch('http://localhost:3000')
  .then(() => testParsing())
  .catch(() => {
    console.error('❌ Dev server not running. Start it with: npm run dev');
    process.exit(1);
  });
