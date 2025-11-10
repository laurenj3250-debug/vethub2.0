import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const parseType = formData.get('parseType') as string; // 'treatment-sheet' | 'soap-note' | 'patient-info'
    const currentData = formData.get('currentData') as string;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Determine media type from file extension
    const ext = imageFile.name.toLowerCase().split('.').pop();
    const mediaTypeMap: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    const mediaType = mediaTypeMap[ext || 'jpeg'] || 'image/jpeg';

    // Build extraction prompt based on parse type
    let extractionPrompt = '';

    if (parseType === 'treatment-sheet') {
      extractionPrompt = `You are analyzing a veterinary treatment sheet screenshot (likely from VetRadar, EzyVet, or similar hospital EMR).

CRITICAL SAFETY REQUIREMENTS:
1. Extract medication names and doses with 100% accuracy - any error could harm a patient
2. Include units (mg/kg, mL, mg, etc.) - NEVER omit units
3. Preserve frequency exactly as written (q8h, BID, TID, etc.)
4. If dose is unclear or ambiguous, flag it in the "notes" field
5. If you cannot read a medication name clearly, mark it as "UNCLEAR: [best guess]"

Extract the following information from this treatment sheet:

PATIENT INFORMATION:
- Patient name
- Species (dog/cat/other)
- Weight (with units: kg or lbs)
- Age
- Sex
- Breed

CURRENT MEDICATIONS & TREATMENTS:
For each medication/treatment, extract:
- Drug name (generic preferred, include brand name if shown)
- Dose (exact number with units: mg/kg, mL, mg, etc.)
- Route (PO, IV, SQ, IM, etc.)
- Frequency (q8h, BID, TID, SID, PRN, etc.)
- Start date/time if visible
- Any special instructions (with food, slow IV push, etc.)

MONITORING PARAMETERS:
- Any monitoring orders (neuro checks, vitals frequency, etc.)
- Pain scores or scales
- Urination/defecation monitoring
- Appetite monitoring

DIAGNOSTICS ORDERED:
- Blood work (CBC, chemistry, etc.)
- Imaging (radiographs, MRI, CT, etc.)
- Other tests (CSF tap, urinalysis, etc.)

TREATMENTS/PROCEDURES:
- Physical therapy orders
- Wound care
- IV fluid orders (rate, type)
- Feeding instructions

Return ONLY a valid JSON object with these exact fields:
{
  "patientInfo": {
    "name": "",
    "species": "",
    "weight": "",
    "age": "",
    "sex": "",
    "breed": ""
  },
  "medications": [
    {
      "name": "",
      "dose": "",
      "route": "",
      "frequency": "",
      "startDate": "",
      "instructions": "",
      "safetyFlag": "" // Only populate if dose is unclear or concerning
    }
  ],
  "monitoring": {
    "neuroChecks": "",
    "vitals": "",
    "painScore": "",
    "urination": "",
    "appetite": ""
  },
  "diagnostics": "",
  "treatments": "",
  "ivFluids": "",
  "feedingInstructions": "",
  "warnings": [] // List any unclear medications, illegible text, or safety concerns
}

If any field is not visible in the screenshot, leave it as an empty string or empty array.`;

    } else if (parseType === 'soap-note') {
      extractionPrompt = `You are analyzing a veterinary SOAP note screenshot.

Extract information to populate a neurological SOAP note. Look for:

PATIENT INFO:
- Name, species, breed, age, sex, weight

SUBJECTIVE/HISTORY:
- Chief complaint
- Current medications
- Previous diagnostics (MRI, CT, radiographs, blood work)
- Clinical signs described by owner
- Progression (improving, worsening, static)
- GI signs (vomiting, diarrhea)
- PU/PD status
- Appetite changes
- Pain or vocalization

OBJECTIVE/PHYSICAL EXAM:
- Mental status (BAR, QAR, dull, obtunded, etc.)
- Gait description (ambulatory, non-ambulatory paresis, tetraparesis, etc.)
- Cranial nerves findings
- Postural reactions (proprioception)
- Spinal reflexes
- Muscle tone and mass
- Nociception/deep pain
- General PE findings (heart, lungs, abdomen, etc.)

ASSESSMENT:
- Neurolocalization (T3-L3, C1-C5, L4-S1, prosencephalon, etc.)
- Differential diagnoses
- Grade of paresis (if IVDD case)

PLAN:
- Diagnostics recommended or performed
- Treatments prescribed
- Prognosis discussed
- Recheck timeline

Return ONLY a valid JSON object with fields matching SOAP structure:
{
  "name": "",
  "age": "",
  "sex": "",
  "breed": "",
  "species": "",
  "weight": "",
  "currentHistory": "",
  "medications": "",
  "prevDiagnostics": "",
  "csvd": "none", // or "vomiting", "diarrhea", "both"
  "pupd": "none", // or "PU", "PD", "PU/PD"
  "appetite": "normal", // or "good", "decreased", "increased", "poor"
  "painfulVocalizing": "None", // or "Mild", "Moderate", "Severe"
  "mentalStatus": "",
  "gait": "",
  "cranialNerves": "",
  "posturalReactions": "",
  "spinalReflexes": "",
  "tone": "",
  "muscleMass": "",
  "nociception": "",
  "neurolocalization": "",
  "ddx": "",
  "diagnosticsToday": "",
  "treatments": "",
  "progression": ""
}`;

    } else if (parseType === 'patient-info') {
      extractionPrompt = `You are analyzing a veterinary patient information screenshot (from EzyVet, PIMS, or similar).

Extract patient demographics and contact information:

PATIENT DATA:
- Patient name
- Patient ID number
- Species
- Breed
- Age/Date of birth
- Sex (M/F, neutered/intact)
- Weight
- Color/markings

OWNER DATA:
- Owner name
- Phone number(s)
- Email
- Address

MEDICAL SUMMARY:
- Current medications
- Active problems/diagnoses
- Allergies
- Recent visit dates
- Upcoming appointments

Return ONLY a valid JSON object:
{
  "patientName": "",
  "patientId": "",
  "species": "",
  "breed": "",
  "age": "",
  "sex": "",
  "weight": "",
  "color": "",
  "ownerName": "",
  "ownerPhone": "",
  "ownerEmail": "",
  "ownerAddress": "",
  "currentMedications": "",
  "activeProblems": "",
  "allergies": "",
  "recentVisits": "",
  "upcomingAppointments": ""
}`;
    }

    // Use Claude Vision API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      temperature: 0, // Zero temperature for accuracy on medical data
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    const responseText = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : '';

    // Extract JSON from response
    let extractedData = {};
    let warnings: string[] = [];

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);

        // Extract warnings if present
        if (parseType === 'treatment-sheet' && 'warnings' in extractedData) {
          warnings = (extractedData as any).warnings || [];
        }
      }
    } catch (parseError) {
      console.error('Failed to parse Claude vision response:', parseError);
      console.error('Response was:', responseText);
      return NextResponse.json(
        { error: 'Could not parse screenshot', details: 'AI response was not valid JSON' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      extractedData,
      warnings,
      rawResponse: responseText, // For debugging
    });

  } catch (error: any) {
    console.error('Screenshot parse error:', error);
    return NextResponse.json(
      { error: 'Screenshot parsing failed', details: error.message },
      { status: 500 }
    );
  }
}
