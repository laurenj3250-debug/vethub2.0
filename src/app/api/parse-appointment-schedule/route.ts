import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Using Claude Sonnet 4.5 model (current)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return NextResponse.json(
        { error: 'API key not configured', details: 'ANTHROPIC_API_KEY environment variable is missing' },
        { status: 500 }
      );
    }

    const { text, mode = 'multi' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Use Claude to parse patient data for rounding table
    const parsingPrompt = `You are parsing veterinary patient data for morning rounds preparation.

Extract patient information from the following text and return a JSON array of patients.

For EACH patient found, extract these fields (use null if not mentioned):
- patientName: MUST be BOTH pet name AND owner last name combined (e.g., "Buddy Smith" = pet "Buddy" + owner last name "Smith"). If you can ONLY find the pet name (e.g., "Buddy"), try to find the owner's last name in the text and append it. Format: "PetName OwnerLastName"
- age: Age with units (e.g., "5y 3m", "2 years", "6mo")
- status: "new", "recheck", or "mri-dropoff" - Detect from keywords:
  * "mri-dropoff" for: "MRI drop off", "MRI drop-off", "dropping off for MRI", "MRI scheduled", "MRI today"
  * "new" for: "new patient", "first visit", "initial consult"
  * "recheck" for: "recheck", "follow-up", "re-eval", "reexam"
  If whyHereToday mentions MRI, use "mri-dropoff". If lastVisit has a date, likely "recheck". If no visit history, likely "new". Default to "recheck" if unclear.
- whyHereToday: Presenting complaint or reason for visit
- lastVisit: Simple text - include date and reason together (e.g., "11/01/2025 - Recheck MRI")
- mri: Simple text - include date and findings together (e.g., "10/15/2025 - T13-L1 IVDD with spinal cord compression")
- bloodwork: Simple text - include date and ALL values/abnormalities (e.g., "11/01/2025 - WBC 18.3 (H), Neutrophils 15.2 (H), BUN 45 (H)")
- medications: Simple text - list all meds with details (e.g., "Gabapentin 10mg/kg q8h PO, Carprofen 2.2mg/kg q12h PO")
- changesSinceLastVisit: Any progression or status changes
- otherNotes: Miscellaneous important information

IMPORTANT:
- Return ONLY valid JSON, no other text
- ALL fields are simple text strings (except status which is "new"|"recheck"|"mri-dropoff")
- Extract ALL bloodwork values mentioned, don't skip any
- If multiple patients are in the text, return an array with all of them
- Use null for missing data, don't guess

Patient Data:
${text}

Return format:
[
  {
    "patientName": "Buddy Smith",
    "age": "5y 2m",
    "status": "recheck",
    "whyHereToday": "Acute hind limb paresis",
    "lastVisit": "11/01/2025 - Recheck MRI",
    "mri": "10/15/2025 - T13-L1 IVDD with severe spinal cord compression",
    "bloodwork": "11/01/2025 - WBC 18.3 (H), Neutrophils 15.2 (H), PCV 48%, TP 6.8",
    "medications": "Gabapentin 10mg/kg q8h PO, Carprofen 2.2mg/kg q12h PO",
    "changesSinceLastVisit": "Ambulatory paraparesis improved to non-ambulatory tetraparesis",
    "otherNotes": "Owner reports decreased appetite"
  }
]

CRITICAL: patientName must include BOTH pet name and owner last name. Examples:
- ✅ CORRECT: "Buddy Smith", "Max Johnson", "Luna Garcia"
- ❌ WRONG: "Buddy", "Max", "Luna" (missing owner last name)

Return ONLY the JSON array, no markdown, no explanations:`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
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
      status: patient.status || 'recheck', // Default to recheck if not specified
      lastUpdated: new Date().toISOString(),
      rawText: text, // Store original text for reference
    }));

    return NextResponse.json({
      patients: patientsWithMetadata,
      count: patientsWithMetadata.length,
    });

  } catch (error: any) {
    console.error('Parse error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type,
      headers: error.headers,
    });

    return NextResponse.json(
      {
        error: 'Parsing failed',
        details: error.message,
        statusCode: error.status,
        errorType: error.type
      },
      { status: 500 }
    );
  }
}
