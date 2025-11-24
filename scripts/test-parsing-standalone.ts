/**
 * Standalone test for appointment parsing
 * Tests the parsing logic directly without requiring dev server
 */

import Anthropic from '@anthropic-ai/sdk';

const RILEY_DATA = `Patient
Riley (FS)
Patient ID: TF_562510
Date of Birth: 06-29-2019
6 years 4 months 25 days - 16.00kg
Canine - Labradoodle

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

Current Medications:
Phenobarbital 64.8mg - 1 tab PO q12h
KBr 250mg/mL: 2mL PO q24h
Ellevet`;

// The actual prompt from the API route
const parsingPrompt = `You are parsing veterinary appointment data. The input can be in ANY format - spreadsheet data, EMR exports, handwritten notes, tab-separated values, or free text.

Your job is to identify EACH SEPARATE PATIENT/APPOINTMENT and extract what information is available.

CRITICAL PARSING RULES:
1. Each line or row typically represents ONE patient - DO NOT combine multiple patients into one
2. Look for patterns: time slots, patient names (often "PetName OwnerLastName" format), reasons for visit
3. Tab-separated or comma-separated data: each column contains different info
4. If you see multiple times listed, each time is likely a different appointment

For EACH patient/appointment found, extract:
- appointmentTime: Time of appointment (e.g., "9:00 AM", "10:30", "1400") - convert to "H:MM AM/PM" format
- patientName: Patient/pet name. Look for names like "Max Johnson", "Bella (Smith)", "FLUFFY JONES". MUST extract this - it's the most important field!
- age: Age if mentioned (e.g., "5y", "3 years", "8mo")
- status: "new", "recheck", or "mri-dropoff"
  * "mri-dropoff": MRI scheduled, dropping off for MRI
  * "new": new patient, first visit, initial consult
  * "recheck": follow-up, re-eval, reexam (DEFAULT if unclear)
- whyHereToday: Reason for visit, presenting complaint, or appointment type
- lastVisit: Previous visit date/info if mentioned
- mri: MRI date/findings if mentioned
- bloodwork: Bloodwork values if mentioned
- medications: Current medications if mentioned
- changesSinceLastVisit: Status changes if mentioned
- otherNotes: Any other relevant information

IMPORTANT:
- Return ONLY valid JSON array, no markdown code blocks, no explanations
- If you find multiple patients, return an array with ALL of them
- EVERY patient needs at least a patientName - if you can't determine a name, use the most identifying text available
- Use null for fields that aren't mentioned
- DO NOT put multiple patients' data into one patient object

Patient Data to Parse:
${RILEY_DATA}

Return ONLY a JSON array like this (no markdown, no \`\`\`json, just raw JSON):
[{"appointmentTime":"9:00 AM","patientName":"Max Johnson","age":"5y","status":"recheck","whyHereToday":"Seizure recheck","lastVisit":null,"mri":null,"bloodwork":null,"medications":"Gabapentin 100mg","changesSinceLastVisit":null,"otherNotes":null}]`;

async function testParsing() {
  console.log('🧪 Testing Appointment Parsing (Standalone)\n');
  console.log('Input: Riley patient data (' + RILEY_DATA.length + ' chars)\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    console.log('Calling Claude API...\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: parsingPrompt,
      }],
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    console.log('Claude response (first 500 chars):\n', responseText.substring(0, 500), '\n');

    // Parse the JSON
    let cleanedResponse = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);
    const patients = Array.isArray(parsed) ? parsed : [parsed];

    console.log('✅ Parsing successful!\n');
    console.log('Extracted patients:', patients.length);
    console.log('\nFull parsed data:');
    console.log(JSON.stringify(patients, null, 2));

    // Validation
    console.log('\n📊 Validation Results:');
    const patient = patients[0];

    const checks = [
      { field: 'patientName', contains: 'Riley', value: patient?.patientName },
      { field: 'age', contains: '6y', value: patient?.age },
      { field: 'status', equals: 'recheck', value: patient?.status },
      { field: 'whyHereToday', contains: 'seizure', value: patient?.whyHereToday },
      { field: 'medications', contains: 'Phenobarbital', value: patient?.medications },
      { field: 'lastVisit', contains: '10/15', value: patient?.lastVisit },
      { field: 'mri', contains: '10/16/25', value: patient?.mri },
      { field: 'bloodwork', contains: 'Phenobarbital', value: patient?.bloodwork },
    ];

    let passed = 0;
    checks.forEach(({ field, contains, equals, value }) => {
      let success = false;
      if (equals) {
        success = value === equals;
      } else if (contains) {
        success = value && typeof value === 'string' && value.toLowerCase().includes(contains.toLowerCase());
      }

      if (success) passed++;

      const emoji = success ? '✅' : '❌';
      const display = value ? (value.length > 60 ? value.substring(0, 60) + '...' : value) : 'null';
      console.log(`${emoji} ${field}: ${display}`);
    });

    console.log(`\n🎯 Score: ${passed}/${checks.length} checks passed`);

    if (passed < checks.length) {
      console.log('\n⚠️  Some fields missing or incorrect. Prompt may need improvement.');
      process.exit(1);
    } else {
      console.log('\n✨ All checks passed! Prompt is working well.');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

testParsing();
