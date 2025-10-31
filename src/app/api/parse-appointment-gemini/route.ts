
import { NextResponse } from 'next/server';
import { parseAppointment } from '@/ai/flows/parse-appointment-flow';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const parsedData = await parseAppointment(text);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error processing appointment request:', error);
    const errorMessage = error.message || 'An unknown error occurred during AI parsing.';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
