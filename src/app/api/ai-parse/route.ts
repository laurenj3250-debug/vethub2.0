import { NextRequest, NextResponse } from 'next/server';
import { parsePatientBlurb } from '@/lib/ai-parser';

/**
 * POST /api/ai-parse
 * Parse patient text using AI and return structured data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Call AI parser
    const parsed = await parsePatientBlurb(text);

    // Transform to format expected by UnifiedPatientForm
    const response = {
      patientName: parsed.patientName || '',
      species: parsed.species || 'Dog',
      breed: parsed.breed || '',
      age: parsed.age || '',
      sex: parsed.sex || '',
      weight: parsed.weight || '',
      visitType: 'medical', // Default, can be inferred from text
      currentHistory: text, // Include original text
      currentMedications: parsed.medications?.join(', ') || '',
      problems: parsed.problem || '',
      diagnosticFindings: '',
      treatments: '',
      fluids: '',
      neurolocalization: '',
      ddx: '',
      diagnosticsToday: '',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error parsing patient text:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse patient text',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
