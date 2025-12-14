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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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
              text: `Analyze this VetRadar treatment sheet image and extract ALL clinical data for a veterinary rounding sheet.

CRITICAL INSTRUCTIONS FOR STICKER DATA:
- FIND patient ID, client ID, consult number (usually in header or sidebar)
- FIND owner name and phone number (check patient info section)
- FIND date of birth (DOB) and color/markings if visible
- These fields are ESSENTIAL for label printing - look carefully!

CRITICAL INSTRUCTIONS FOR TREATMENT DATA:
- Read EVERY medication, dose, route, frequency from the treatment grid
- Extract ALL vital signs with timestamps (Temp, HR, RR, Pain scores)
- Capture physical exam findings (MM, CRT, attitude, etc.)
- Read fluid orders (type, rate, additives)
- Note any CRI medications with doses
- Identify IV catheter information
- Extract nursing care tasks and procedures
- Note any clinical concerns or alerts

Return ONLY a JSON object with this exact structure:

{
  "patientName": "patient name from header",
  "patientId": "patient ID number if visible (e.g., 674131)",
  "clientId": "client/owner ID number if visible",
  "consultNumber": "consult number if visible (e.g., 5877395)",
  "ownerName": "owner full name if visible",
  "ownerPhone": "owner phone number if visible",
  "dateOfBirth": "patient date of birth if visible",
  "color": "patient color/markings if visible",
  "signalment": "age sex species breed weight",
  "location": "ward/kennel/cage location",
  "problems": "primary diagnosis/presenting complaint",
  "medications": [
    {
      "name": "medication name",
      "dose": "dose amount",
      "route": "PO/IV/SQ/etc",
      "frequency": "q8h/BID/TID/etc",
      "times": ["scheduled times like 8am, 4pm, etc"]
    }
  ],
  "vitals": {
    "latestTemp": "most recent temp with unit",
    "latestHR": "most recent HR",
    "latestRR": "most recent RR",
    "painScore": "pain score if visible",
    "trends": "any notable trends like increasing HR, declining temp"
  },
  "physicalExam": {
    "mm": "mucous membrane color",
    "crt": "CRT in seconds",
    "attitude": "BAR/QAR/depressed/etc",
    "other": "any other PE findings"
  },
  "fluids": {
    "type": "LRS/Normosol/etc",
    "rate": "ml/hr or ml/kg/day",
    "additives": "KCl, etc if visible"
  },
  "cri": {
    "medications": "fentanyl, ketamine, etc with doses",
    "rates": "mcg/kg/hr or mcg/kg/min"
  },
  "ivc": {
    "location": "left cephalic, right saphenous, etc",
    "status": "patent, needs replacement, etc"
  },
  "procedures": ["list of scheduled procedures"],
  "nursingCare": ["list of nursing tasks"],
  "diagnosticFindings": "any lab results, imaging findings visible",
  "concerns": "clinical concerns, monitoring needs, alerts"
}

Extract MAXIMUM data. If something is not visible in the image, use empty string "". Return ONLY the JSON, no other text.`
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

    // Transform to rounding sheet format
    const roundingData = {
      signalment: parsed.signalment || '',
      location: parsed.location || '',
      icuCriteria: '', // Manual entry
      code: '', // Manual entry (Green/Yellow/Orange/Red)
      problems: parsed.problems || '',
      diagnosticFindings: parsed.diagnosticFindings || '',

      // Format medications as single string
      therapeutics: parsed.medications?.map((med: any) =>
        `${med.name} ${med.dose} ${med.route} ${med.frequency}`
      ).join(', ') || '',

      // IVC/Fluids
      ivc: parsed.ivc?.location || (parsed.fluids?.type ? 'IVC present' : ''),
      fluids: parsed.fluids?.type ? `${parsed.fluids.type} ${parsed.fluids.rate}` : '',
      cri: parsed.cri?.medications || '',

      // Concerns
      overnightDx: '', // Manual entry
      concerns: [
        parsed.concerns,
        parsed.vitals?.trends,
        parsed.ivc?.status?.includes('replacement') ? 'Replace IVC' : '',
      ].filter(Boolean).join('; '),

      comments: [
        parsed.physicalExam?.attitude ? `Attitude: ${parsed.physicalExam.attitude}` : '',
        parsed.physicalExam?.mm ? `MM: ${parsed.physicalExam.mm}` : '',
        parsed.vitals?.painScore ? `Pain: ${parsed.vitals.painScore}` : '',
      ].filter(Boolean).join('; '),
    };

    // Include demographics for sticker printing
    const demographics = {
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
