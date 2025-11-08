import { NextResponse } from 'next/server';
import { parseRounding } from '@/ai/flows/parse-rounding-flow';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Re-using the powerful rounding parser for MRI reports
    const parsedData = await parseRounding(text);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error processing MRI report request:', error);
    const errorMessage = error.message || 'An unknown error occurred during AI parsing.';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
