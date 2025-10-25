import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check for Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a veterinary assistant. Extract the following information from this patient record and return it as JSON:

{
  "name": "patient name",
  "signalment": "age, weight, sex, breed",
  "problem": "presenting problem or reason for visit",
  "lastRecheck": "last recheck date (MM/DD/YYYY format)",
  "lastPlan": "plan from last visit",
  "mriDate": "MRI date (MM/DD/YYYY format)",
  "mriFindings": "MRI findings",
  "bloodworkDue": "when bloodwork is due or last date",
  "medications": "current medications with doses",
  "otherConcerns": "owner concerns or clinical signs"
}

Only return the JSON object, no other text. If a field is not found, use an empty string.

Patient Record:
${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'AI parsing failed', details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse appointment error:', error);
    return NextResponse.json(
      { error: 'Failed to parse appointment' },
      { status: 500 }
    );
  }
}
