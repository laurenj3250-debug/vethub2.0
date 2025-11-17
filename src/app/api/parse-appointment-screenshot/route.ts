import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Detect media type from file type
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // Use Claude Vision to parse appointment schedule from screenshot
    const parsingPrompt = `You are analyzing a screenshot of a veterinary appointment schedule.

Extract ALL appointments from this image and return them as a JSON array.

For EACH appointment found, extract:
- appointmentTime: Time in 12-hour format (e.g., "9:30 AM", "2:00 PM")
- patientName: Full patient name (pet name + owner last name if available)
- age: Age with units if visible (e.g., "5y 3m", "2 years", "6mo", or null if not shown)
- status: Best guess from appointment type:
  * "new" for: "new patient", "first visit", "initial consult", "new client"
  * "mri-dropoff" for: "MRI drop off", "MRI scan", "imaging", "dropping off for MRI"
  * "recheck" for: "recheck", "follow-up", "re-eval", "reexam", or if unclear
- whyHereToday: Presenting complaint, appointment type, or reason for visit
- lastVisit: null (we can't see this from screenshot)
- mri: null (we can't see this from screenshot)
- bloodwork: null (we can't see this from screenshot)
- medications: null (we can't see this from screenshot)
- changesSinceLastVisit: null (we can't see this from screenshot)
- otherNotes: Any other visible notes or important info

IMPORTANT:
- Return ONLY valid JSON, no other text
- Extract EVERY appointment you can see in the image
- Sort by appointment time (earliest first)
- If time is not visible, use null for appointmentTime
- Use null for any field not visible in the screenshot
- Don't make up data - only extract what you can clearly see

Return format:
[
  {
    "appointmentTime": "9:30 AM",
    "patientName": "Buddy Smith",
    "age": "5y",
    "status": "recheck",
    "whyHereToday": "IVDD recheck",
    "lastVisit": null,
    "mri": null,
    "bloodwork": null,
    "medications": null,
    "changesSinceLastVisit": null,
    "otherNotes": "Owner requested morning appointment"
  }
]

Return ONLY the JSON array, no markdown, no explanations:`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: parsingPrompt,
          },
        ],
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
      rawText: `Imported from screenshot on ${new Date().toLocaleString()}`,
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
