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

COMMON INPUT FORMATS TO RECOGNIZE:
1. Tab-separated: "9:00 AM\\tMax Johnson\\t5y\\tSeizure recheck\\tGabapentin 100mg"
2. Time-based list: "9:00 - Max Johnson - seizures\\n9:30 - Bella Smith - back pain"
3. EMR format: "Patient: Max Johnson | Age: 5y | Chief Complaint: Seizures"
4. Simple list: "Max Johnson seizure recheck\\nBella Smith new patient weakness"

IMPORTANT:
- Return ONLY valid JSON array, no markdown code blocks, no explanations
- If you find multiple patients, return an array with ALL of them
- EVERY patient needs at least a patientName - if you can't determine a name, use the most identifying text available
- Use null for fields that aren't mentioned
- DO NOT put multiple patients' data into one patient object

Patient Data to Parse:
${text}

Return ONLY a JSON array like this (no markdown, no \`\`\`json, just raw JSON):
[{"appointmentTime":"9:00 AM","patientName":"Max Johnson","age":"5y","status":"recheck","whyHereToday":"Seizure recheck","lastVisit":null,"mri":null,"bloodwork":null,"medications":"Gabapentin 100mg","changesSinceLastVisit":null,"otherNotes":null}]`;

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

    console.log('Claude raw response:', responseText.substring(0, 500));

    // Extract JSON from response - handle various formats
    let parsedPatients: any[] = [];
    try {
      // First, clean the response - remove markdown code blocks if present
      let cleanedResponse = responseText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Try direct parse first (if it's clean JSON)
      try {
        const directParse = JSON.parse(cleanedResponse);
        parsedPatients = Array.isArray(directParse) ? directParse : [directParse];
      } catch {
        // Try to find JSON array in the response
        const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\](?=\s*$|\s*[^,\]\}])/);
        if (jsonMatch) {
          parsedPatients = JSON.parse(jsonMatch[0]);
        } else {
          // Try parsing as single object and wrap in array
          const objMatch = cleanedResponse.match(/\{[\s\S]*?\}(?=\s*$|\s*[^,\]\}])/);
          if (objMatch) {
            parsedPatients = [JSON.parse(objMatch[0])];
          }
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

    // Validate and clean up parsed patients
    const validPatients = parsedPatients
      .filter((patient: any) => patient && typeof patient === 'object')
      .map((patient: any) => {
        // Ensure patientName exists and is not just whitespace
        let name = patient.patientName || patient.name || patient.patient || '';
        if (typeof name === 'string') {
          name = name.trim();
        }
        // If still no name, try to extract from other fields
        if (!name && patient.whyHereToday) {
          // Sometimes the name might be in the reason field
          name = 'Patient ' + (parsedPatients.indexOf(patient) + 1);
        }
        return {
          ...patient,
          patientName: name || 'Unknown Patient',
        };
      });

    console.log(`Parsed ${validPatients.length} patients from input`);

    // Add unique IDs and timestamps to each patient
    const patientsWithMetadata = validPatients.map((patient: any, index: number) => ({
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
