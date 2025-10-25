
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      );
    }

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
            content: `You are a veterinary assistant. Extract the following information from this patient record and return it as JSON.

Extract appointment-specific information:

{
  "name": "patient name",
  "signalment": "brief signalment (age, sex, breed)",
  "problem": "presenting problem or reason for visit",
  "lastRecheck": "date of last recheck",
  "lastPlan": "plan from last recheck",
  "mriDate": "date of MRI if available",
  "mriFindings": "findings from MRI if available",
  "medications": "current medications, each on a new line",
  "otherConcerns": "owner concerns or clinical signs"
}

Rules:
- For 'name', extract only the patient's name.
- For 'signalment', create a brief description (e.g., "8yr MN Labrador").
- For 'medications', list each one as a single string, separated by newlines.
- If a field is not found, use an empty string.
- Only return the JSON object, no other text.

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
        { error: 'AI parsing failed', details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;
    
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
      { error: 'Failed to parse appointment data' },
      { status: 500 }
    );
  }
}
