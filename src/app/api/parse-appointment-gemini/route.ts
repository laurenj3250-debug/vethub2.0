
import { NextResponse } from 'next/server';

// This is a placeholder endpoint and does not perform AI parsing.
// It exists to prevent 404 errors from the main page form.
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Basic non-AI parsing: take the first line as the name.
    const lines = text.split('\n');
    const name = lines[0]?.trim() || 'Unnamed Patient';

    const parsedData = {
      name: name,
      signalment: '',
      problem: '',
      lastRecheck: '',
      lastPlan: '',
      mriDate: '',
      mriFindings: '',
      medications: '',
      otherConcerns: text, // Put the whole blurb in other concerns
    };

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error processing basic appointment request:', error);
    const errorMessage = error.message || 'An unknown error occurred during parsing.';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
