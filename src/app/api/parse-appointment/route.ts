import { NextRequest, NextResponse } from 'next/server';

// This API route is no longer used by the application but is kept for potential future use or reference.
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check for Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are a veterinary assistant. Extract the following information from this patient record and return it as JSON:

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
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return NextResponse.json(
        { error: 'AI parsing failed' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;

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
