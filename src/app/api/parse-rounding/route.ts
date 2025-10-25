
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
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `You are a veterinary assistant. Extract the following information from this patient record and return it as JSON.

Extract comprehensive patient information including:

{
  "patientInfo": {
    "species": "dog or cat",
    "breed": "breed name",
    "sex": "normalized sex (M, MN, F, FS)",
    "age": "age description",
    "dob": "date of birth if available",
    "weight": "weight with unit (e.g., 25.5 kg)",
    "color": "coat color",
    "patientId": "patient ID number",
    "clientId": "client ID number",
    "ownerName": "owner's name",
    "ownerPhone": "owner's phone number"
  },
  "roundingData": {
    "signalment": "brief signalment (age, sex, breed)",
    "problemList": "main problems/diagnoses",
    "subjectiveAssessment": "patient status, observations, concerns",
    "objectiveFindings": "physical exam findings, vitals",
    "diagnosticFindings": "lab results, imaging findings, abnormal values",
    "therapeutics": "current medications with doses and frequencies",
    "plan": "treatment plan and next steps"
  },
  "medications": ["list of medications as separate strings"],
  "bloodwork": "raw bloodwork section if present"
}

Rules:
- For sex, normalize to: M (male intact), MN (male neutered), F (female intact), FS (female spayed)
- Extract ALL medications with their doses (e.g., "Gabapentin 100mg PO BID")
- Identify abnormal bloodwork values and include indicators like ↑ or ↓
- For signalment, create a brief description suitable for rounding (e.g., "8yr MN Labrador")
- Extract problem list as a concise list of diagnoses or concerns
- If a field is not found, use an empty string or empty array for medications
- Only return the JSON object, no other text

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

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse rounding sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to parse rounding sheet data' },
      { status: 500 }
    );
  }
}
