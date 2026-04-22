import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/**
 * POST /api/parse-vetradar-image
 * Parse VetRadar treatment sheet screenshot using Claude Vision
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
    const { image, imageType = 'image/png' } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image data required' },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Extract ONLY patient + owner demographics from this VetRadar sheet. Skip meds, vitals, PE, fluids, CRI, procedures, nursing, diagnostics, concerns — those are entered manually.

Return ONLY this JSON (use empty string "" when not visible):

{
  "patientName": "pet's first name only",
  "patientId": "patient ID (e.g., 674131)",
  "clientId": "client/owner ID",
  "consultNumber": "consult # (e.g., 5877395)",
  "ownerName": "owner LAST NAME only (surname). 'Russell Bennett' becomes 'Bennett'",
  "ownerPhone": "primary phone",
  "dateOfBirth": "DOB",
  "color": "color/markings",
  "signalment": "age sex species breed weight in one string",
  "location": "ward/kennel/cage"
}

Return ONLY the JSON, no other text.`
            }
          ]
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude Vision');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Demographics-only mode: clinical fields (meds, vitals, PE, fluids, CRI, diagnostics,
    // concerns, comments) are left empty intentionally — Lauren enters those manually.
    // The signalment + location come through for the MRI sheet / main board / rounding row.
    const roundingData = {
      signalment: parsed.signalment || '',
      location: parsed.location || '',
      icuCriteria: '',
      code: '',
      problems: '',
      diagnosticFindings: '',
      therapeutics: '',
      ivc: '',
      fluids: '',
      cri: '',
      overnightDx: '',
      concerns: '',
      comments: '',
    };

    // Sticker + main board + MRI sheet fields
    const demographics = {
      patientName: parsed.patientName || '',
      patientId: parsed.patientId || '',
      clientId: parsed.clientId || '',
      consultNumber: parsed.consultNumber || '',
      ownerName: parsed.ownerName || '',
      ownerPhone: parsed.ownerPhone || '',
      dateOfBirth: parsed.dateOfBirth || '',
      color: parsed.color || '',
    };

    return NextResponse.json({
      success: true,
      data: roundingData,
      demographics, // Include demographics for sticker data
      raw: parsed, // Include raw parsed data for debugging
    });

  } catch (error) {
    console.error('[API] Error parsing VetRadar image:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse VetRadar image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
