'use server';
/**
 * @fileOverview A server-side API route to parse patient record text using an AI flow.
 */
import { NextResponse } from 'next/server';
import { parsePatientRecord } from '@/ai/flows/parse-patient-record-flow';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Call the AI flow to parse the text
    const parsedData = await parsePatientRecord({ recordText: text });

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('AI parsing error:', error);
    // Provide a more informative error message to the client
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during parsing.';
    return NextResponse.json(
      { error: 'Failed to parse patient record with AI.', details: errorMessage },
      { status: 500 }
    );
  }
}
