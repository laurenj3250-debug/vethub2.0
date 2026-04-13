import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * POST /api/parse-ezyvet
 * Parse pasted EzyVet patient data into structured format
 *
 * This extracts ALL information needed for:
 * - Patient demographics
 * - Sticker generation (owner info, IDs, DOB, color)
 * - Medical history
 * - Current status
 */
export async function POST(request: NextRequest) {
  try {
    if (!anthropic) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text data required' },
        { status: 400 }
      );
    }

    const prompt = `Parse this EzyVet patient record and extract ALL information into a structured format.

CRITICAL - EXTRACT ALL STICKER INFORMATION:
- Patient ID (after "Patient ID:" or "TF_")
- Client/Owner ID if visible
- Owner name (after "Owner")
- Owner phone (look for "Ph:" or "CELL Ph:")
- Date of Birth (after "Date of Birth:")
- Color/markings (in species/breed line)
- Consult number (numbers like 5879522, 5879525)

ALSO EXTRACT:
- Patient name, age, sex, species, breed, weight
- Insurance information
- Current status (In Hospital, etc)
- Recent appointments and consultations
- Recent vitals (temp, HR, RR, pain score, MM, CRT)
- Recent medications and treatments
- Recent lab results (CBC, Chemistry)
- Recent diagnostic findings (radiographs, etc)
- Assessment and plan
- Referring veterinarian

EzyVet Data:
${text}

Return ONLY a JSON object with this structure:
{
  "demographics": {
    "name": "patient name",
    "patientId": "patient ID with TF_ prefix",
    "clientId": "client/owner ID if visible",
    "ownerName": "full owner name",
    "ownerPhone": "phone number",
    "ownerEmail": "email if visible",
    "dateOfBirth": "DOB in format shown",
    "age": "age string (e.g., 13 years 6 months 29 days)",
    "sex": "sex (MN, FS, etc)",
    "species": "species",
    "breed": "breed",
    "weight": "weight with unit",
    "color": "color/markings",
    "microchip": "microchip if visible",
    "insurance": "insurance provider and policy number"
  },
  "status": {
    "current": "In Hospital/Discharged/etc",
    "location": "ward/cage if mentioned"
  },
  "consultations": [
    {
      "consultNumber": "consult number",
      "date": "date and time",
      "chiefComplaint": "presenting complaint",
      "assessment": "assessment text",
      "plan": "treatment plan"
    }
  ],
  "vitals": {
    "weight": "most recent weight",
    "temp": "temperature",
    "hr": "heart rate",
    "rr": "respiratory rate",
    "painScore": "pain score",
    "mm": "mucous membranes",
    "crt": "CRT",
    "attitude": "attitude",
    "pulseQuality": "pulse quality",
    "respiratoryEffort": "respiratory effort"
  },
  "medications": [
    {
      "name": "medication name",
      "dose": "dose",
      "route": "route",
      "frequency": "frequency"
    }
  ],
  "labResults": {
    "cbc": {
      "rbc": "value and unit",
      "hgb": "value and unit",
      "hct": "value and unit",
      "wbc": "value and unit",
      "platelets": "value and unit"
    },
    "chemistry": {
      "glucose": "value",
      "bun": "value",
      "creatinine": "value",
      "alt": "value",
      "alp": "value",
      "lipase": "value"
    }
  },
  "diagnostics": {
    "radiographs": "findings summary",
    "other": "other diagnostic findings"
  },
  "referringVet": {
    "clinic": "clinic name",
    "doctor": "doctor name",
    "phone": "phone number"
  }
}

Extract MAXIMUM data. Use empty string "" for missing fields. Return ONLY JSON.`;

    const maxAttempts = 3;
    let response: Anthropic.Messages.Message | undefined;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        });
        break;
      } catch (err: any) {
        lastErr = err;
        const status = err?.status ?? err?.response?.status;
        const type = err?.error?.error?.type ?? err?.error?.type ?? err?.type;
        const retriable =
          status === 529 ||
          status === 429 ||
          status === 503 ||
          type === 'overloaded_error' ||
          type === 'rate_limit_error';
        if (!retriable || attempt === maxAttempts) throw err;
        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        console.warn(`[API] Anthropic ${status ?? type} on attempt ${attempt}, retrying in ${backoffMs}ms`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
    if (!response) throw lastErr ?? new Error('No response from Anthropic');

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      data: parsed,
    });

  } catch (error: any) {
    console.error('[API] Error parsing EzyVet data:', error);
    const status = error?.status ?? error?.response?.status;
    const type = error?.error?.error?.type ?? error?.error?.type ?? error?.type;
    const isOverload =
      status === 529 ||
      status === 429 ||
      status === 503 ||
      type === 'overloaded_error' ||
      type === 'rate_limit_error';
    if (isOverload) {
      return NextResponse.json(
        {
          error: 'Claude is overloaded — try again in a moment.',
          retryable: true,
          details: error instanceof Error ? error.message : 'Upstream AI overloaded',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to parse EzyVet data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
