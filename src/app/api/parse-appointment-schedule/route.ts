import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Using stable Claude 3.5 Sonnet model (20240620)
const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { text, mode = 'multi' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Use Claude to parse patient data for rounding table
    const parsingPrompt = `You are parsing veterinary patient data for morning rounds preparation.

Extract patient information from the following text and return a JSON array of patients.

For EACH patient found, extract these fields (use null if not mentioned):
- appointmentTime: Time in "HH:MM" 24-hour format or null
- patientName: Full patient name (pet name + owner last name if available)
- age: Age with units (e.g., "5y 3m", "2 years", "6mo")
- whyHereToday: Presenting complaint or reason for visit
- lastVisit: {date: "MM/DD/YYYY" or null, reason: "reason" or null}
- mri: {date: "MM/DD/YYYY" or null, findings: "findings summary" or null}
- bloodwork: {date: "MM/DD/YYYY" or null, abnormalities: ["CBC: WBC 25.3 (H)", "Chem: BUN 85 (H)"] or null}
- medications: [{name: "Drug name", dose: "10 mg/kg", frequency: "q8h", route: "PO"}]
- changesSinceLastVisit: Any progression or status changes
- otherNotes: Miscellaneous important information
- confidence: Provide confidence scores 0-1 for each field you extracted

IMPORTANT:
- Return ONLY valid JSON, no other text
- If multiple patients are in the text, return an array with all of them
- Preserve medication dosing exactly as written
- Use null for missing data, don't guess
- For bloodwork abnormalities, only include values outside reference range

Patient Data:
${text}

Return format:
[
  {
    "appointmentTime": "09:30" or null,
    "patientName": "Buddy Smith",
    "age": "5y 2m",
    "whyHereToday": "Acute hind limb paresis",
    "lastVisit": {"date": "11/01/2025", "reason": "Recheck MRI"},
    "mri": {"date": "10/15/2025", "findings": "T13-L1 IVDD with severe spinal cord compression"},
    "bloodwork": {"date": "11/01/2025", "abnormalities": ["WBC 18.3 (H)", "Neutrophils 15.2 (H)"]},
    "medications": [
      {"name": "Gabapentin", "dose": "10 mg/kg", "frequency": "q8h", "route": "PO"},
      {"name": "Carprofen", "dose": "2.2 mg/kg", "frequency": "q12h", "route": "PO"}
    ],
    "changesSinceLastVisit": "Ambulatory paraparesis improved to non-ambulatory tetraparesis",
    "otherNotes": "Owner reports decreased appetite",
    "confidence": {
      "appointmentTime": 0.9,
      "patientName": 1.0,
      "age": 0.95,
      "whyHereToday": 1.0,
      "lastVisit": 0.8,
      "mri": 0.9,
      "bloodwork": 0.85,
      "medications": 0.95,
      "changesSinceLastVisit": 0.7,
      "otherNotes": 0.6
    }
  }
]

Return ONLY the JSON array, no markdown, no explanations:`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: parsingPrompt,
      }],
    });

    const responseText = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : '';

    // Extract JSON from response
    let parsedPatients = [];
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedPatients = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing as single object and wrap in array
        const objMatch = responseText.match(/\{[\s\S]*\}/);
        if (objMatch) {
          parsedPatients = [JSON.parse(objMatch[0])];
        }
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      console.error('Response was:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: responseText },
        { status: 500 }
      );
    }

    // Add unique IDs and timestamps to each patient
    const patientsWithMetadata = parsedPatients.map((patient: any, index: number) => ({
      id: `patient-${Date.now()}-${index}`,
      sortOrder: index,
      ...patient,
      lastUpdated: new Date().toISOString(),
      rawText: text, // Store original text for reference
    }));

    return NextResponse.json({
      patients: patientsWithMetadata,
      count: patientsWithMetadata.length,
    });

  } catch (error: any) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Parsing failed', details: error.message },
      { status: 500 }
    );
  }
}
